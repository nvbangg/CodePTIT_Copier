(() => {
  "use strict";

  const FAB_ID = "ptit-drl-auto-fab";
  let isRunning = false;
  let isCancelled = false;
  let capturedAuth = null;

  const origFetch = window.fetch;
  window.fetch = function (...args) {
    try {
      const reqHeaders = args[1]?.headers;
      let auth = null;
      if (reqHeaders instanceof Headers) {
        auth = reqHeaders.get("Authorization");
      } else if (reqHeaders && typeof reqHeaders === "object") {
        auth = reqHeaders.Authorization || reqHeaders.authorization;
      }
      if (auth && auth.length > 10) capturedAuth = auth.trim();
    } catch {}
    return origFetch.apply(this, args);
  };

  const origSetReqHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (header, val) {
    if (header && header.toLowerCase() === "authorization" && val && val.length > 10) {
      capturedAuth = val.trim();
    }
    return origSetReqHeader.apply(this, arguments);
  };

  const isAutoReviewActive = () => {
    try {
      return (
        (document.documentElement?.dataset?.autoReviewDrl ??
          sessionStorage.getItem("ptit_autoReviewDrl")) !== "false"
      );
    } catch {
      return true;
    }
  };

  const isDrlPage = () =>
    location.pathname.includes("/lop-hanh-chinh") &&
    location.hash.includes("diem-ren-luyen");

  const showToast = (title, message, type = "success") => {
    document.querySelector(".ptit-drl-toast")?.remove();
    const toast = document.createElement("div");
    toast.className = `ptit-drl-toast ${type}`;

    const content = document.createElement("div");
    const titleEl = document.createElement("div");
    titleEl.className = "ptit-drl-toast-title";
    titleEl.textContent = title;

    const descEl = document.createElement("div");
    descEl.textContent = message;

    content.append(titleEl, descEl);
    toast.appendChild(content);
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px)";
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  };

  const updateFabUi = (text, running = false) => {
    const fab = document.getElementById(FAB_ID);
    if (!fab) return;
    fab.classList.toggle("running", running);
    const label = fab.querySelector(".ptit-drl-label");
    if (label) label.textContent = text;
  };

  const getAuthHeader = () => {
    if (capturedAuth) {
      return capturedAuth.startsWith("Bearer ") ? capturedAuth : `Bearer ${capturedAuth}`;
    }
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (!token) return null;
    const clean = token.replace(/^["']|["']$/g, "").trim();
    return clean.startsWith("Bearer ") ? clean : `Bearer ${clean}`;
  };

  const getDrlContext = () => {
    const entries = performance
      .getEntriesByType("resource")
      .filter((r) => r.name.includes("/slink/phieu-diem-ren-luyen/ban-can-su/page"));
    const lastEntry = entries[entries.length - 1];
    if (!lastEntry) return null;

    try {
      const conditionStr = new URL(lastEntry.name).searchParams.get("condition");
      return conditionStr ? JSON.parse(conditionStr) : null;
    } catch {
      return null;
    }
  };

  const getSsoId = (students = []) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const localId = user.ssoId || user.userSsoId || user.id;
      if (localId) return localId;
    } catch {}

    for (const s of students) {
      const bcs = (s.diemCham || []).find((d) => d.vaiTro === "Ban cán sự");
      if (bcs?.userSsoId) return bcs.userSsoId;
    }
    return null;
  };

  const runBatchApiReview = async () => {
    if (isRunning) {
      isCancelled = true;
      updateFabUi("Đang dừng lại...");
      return;
    }

    const context = getDrlContext();
    if (!context?.dotChamDiemId || !context?.lopHanhChinh) {
      showToast("Lỗi", "Chưa xác định được lớp. Hãy chọn lớp trên trang trước", "error");
      return;
    }

    const authHeader = getAuthHeader();
    if (!authHeader) {
      showToast("Lỗi", "Không tìm thấy token đăng nhập Slink. Vui lòng tải lại trang!", "error");
      return;
    }

    const headers = { Authorization: authHeader };

    isRunning = true;
    isCancelled = false;
    updateFabUi("Đang lấy danh sách...", true);

    try {
      const conditionParam = encodeURIComponent(JSON.stringify(context));
      const listUrl = `https://gwdu.ptit.edu.vn/slink/phieu-diem-ren-luyen/ban-can-su/page?page=1&limit=100&condition=${conditionParam}`;

      const listRes = await fetch(listUrl, { headers, credentials: "omit" });
      if (!listRes.ok) throw new Error(`Không thể tải danh sách lớp (${listRes.status})`);

      const listJson = await listRes.json();
      const students = listJson.data?.result || [];
      const targetStudents = students.filter((s) => s.trangThaiNopBCS !== "Đã gửi");

      if (targetStudents.length === 0) {
        showToast("Hoàn tất", "Tất cả sinh viên đã ở trạng thái Đã gửi", "success");
        return;
      }

      const ssoId = getSsoId(students);
      const idKhaoSat =
        students.find((s) => s.diemCham?.[0]?.idKhaoSat)?.diemCham[0].idKhaoSat ||
        "66c2feeb1eaf4891a9dbf1e3";

      const template = students.find((s) => s.diemCham?.[0]?.danhSachTraLoi?.length > 0)
        ?.diemCham[0].danhSachTraLoi;

      if (!template || template.length === 0) {
        throw new Error("Không thể xác định danh sách tiêu chí từ phiếu điểm lớp");
      }

      const maxAnswers = template.map((a) => ({
        idCauHoi: a.idCauHoi,
        traLoiText: a.traLoiText || "0"
      }));

      const postHeaders = {
        "Content-Type": "application/json",
        ...headers
      };

      let successCount = 0;
      for (let idx = 0; idx < targetStudents.length; idx++) {
        if (isCancelled || !isAutoReviewActive()) break;

        const student = targetStudents[idx];
        const studentName = student.hoTen || student.maSinhVien || `SV #${idx + 1}`;
        updateFabUi(`Duyệt: ${idx + 1}/${targetStudents.length} (${studentName})`, true);

        const payload = {
          danhSachTraLoi: maxAnswers,
          guiNgay: false,
          idDot: context.dotChamDiemId,
          idDotChamDiemRenLuyen: context.dotChamDiemId,
          idKhaoSat,
          nguoiTraLoi: "Ban cán sự",
          ssoId: ssoId || student.ssoId,
          ssoIdSinhVien: student.ssoId,
          trangThaiNopBCS: "Lưu"
        };

        const saveRes = await fetch("https://gwdu.ptit.edu.vn/slink/cau-tra-loi-khao-sat/me", {
          method: "POST",
          headers: postHeaders,
          body: JSON.stringify(payload),
          credentials: "omit"
        });

        if (saveRes.ok) successCount++;
      }

      if (successCount > 0) {
        showToast(
          "Thành công",
          `Đã lưu điểm tối đa qua API cho ${successCount}/${targetStudents.length} sinh viên! Vui lòng tải lại bảng.`
        );
      }
    } catch (err) {
      showToast("Lỗi", err.message, "error");
    } finally {
      isRunning = false;
      isCancelled = false;
      updateFabUi("Duyệt nhanh ĐRL");
    }
  };

  const mountFab = () => {
    if (!isAutoReviewActive() || !isDrlPage()) {
      if (isRunning) isCancelled = true;
      document.getElementById(FAB_ID)?.remove();
      return;
    }

    if (document.getElementById(FAB_ID)) return;

    const fab = document.createElement("button");
    fab.id = FAB_ID;
    fab.type = "button";
    fab.className = "ptit-drl-fab";
    fab.title = "Tự động điền điểm tối đa và Lưu & Gửi sau qua API cho cả lớp";

    const icon = document.createElement("span");
    icon.className = "ptit-drl-fab-icon";
    icon.textContent = "⚡";

    const spinner = document.createElement("div");
    spinner.className = "ptit-drl-fab-spinner";

    const label = document.createElement("span");
    label.className = "ptit-drl-label";
    label.textContent = "Duyệt nhanh ĐRL";

    const stopBadge = document.createElement("span");
    stopBadge.className = "ptit-drl-stop-badge";
    stopBadge.textContent = "✕ Dừng";

    fab.append(icon, spinner, label, stopBadge);
    fab.addEventListener("click", runBatchApiReview);
    document.body.appendChild(fab);
  };

  const initDrlObserver = () => {
    mountFab();
    window.addEventListener("hashchange", mountFab);
    window.addEventListener("popstate", mountFab);

    const observer = new MutationObserver(() => mountFab());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-auto-review-drl"]
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDrlObserver);
  } else {
    initDrlObserver();
  }
})();
