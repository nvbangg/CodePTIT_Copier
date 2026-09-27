(() => {
  "use strict";

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

  const notifyStat = (message, isDone = false, isError = false) => {
    window.dispatchEvent(
      new CustomEvent("ptit-drl-stat", {
        detail: { message, isDone, isError }
      })
    );
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

  const isBcsSubmitted = (student) => {
    if (student.trangThaiNopBCS?.trim() === "Đã gửi") return true;
    const bcs = (student.diemCham || []).find((d) => d.vaiTro === "Ban cán sự");
    return bcs?.trangThaiNopBCS?.trim() === "Đã gửi";
  };

  const hasStudentSubmitted = (student) => {
    if (student.trangThaiNopSV?.trim() === "Đã gửi") return true;
    const sv = (student.diemCham || []).find((d) => d.vaiTro === "Sinh viên");
    return sv?.trangThaiNopSV?.trim() === "Đã gửi";
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

  const runBatchApiReview = async (submitDirectly = false, includeUnsubmitted = false) => {
    if (isRunning) {
      isCancelled = true;
      notifyStat("Đang dừng tiến trình...", true, false);
      return;
    }

    const context = getDrlContext();
    if (!context?.dotChamDiemId || !context?.lopHanhChinh) {
      notifyStat("Chưa xác định được lớp. Hãy mở bảng điểm trên Slink trước!", true, true);
      return;
    }

    const authHeader = getAuthHeader();
    if (!authHeader) {
      notifyStat("Không tìm thấy token đăng nhập Slink. Hãy tải lại trang Slink!", true, true);
      return;
    }

    const headers = { Authorization: authHeader };

    isRunning = true;
    isCancelled = false;
    const actionDesc = submitDirectly ? "gửi chính thức" : "lưu nháp";
    notifyStat(`Đang tải danh sách sinh viên...`, false, false);

    try {
      const conditionParam = encodeURIComponent(JSON.stringify(context));
      const listUrl = `https://gwdu.ptit.edu.vn/slink/phieu-diem-ren-luyen/ban-can-su/page?page=1&limit=100&condition=${conditionParam}`;

      const listRes = await fetch(listUrl, { headers, credentials: "omit" });
      if (!listRes.ok) throw new Error(`Không thể tải danh sách lớp (${listRes.status})`);

      const listJson = await listRes.json();
      const students = listJson.data?.result || [];
      const alreadySubmittedBcs = students.filter(isBcsSubmitted);
      const pendingBcsStudents = students.filter((s) => !isBcsSubmitted(s));

      if (pendingBcsStudents.length === 0) {
        notifyStat("Tất cả sinh viên trong lớp đã ở trạng thái Đã gửi.", true, false);
        return;
      }

      const targetStudents = includeUnsubmitted
        ? pendingBcsStudents
        : pendingBcsStudents.filter(hasStudentSubmitted);
      const unsubmittedSvCount = pendingBcsStudents.length - targetStudents.length;

      if (targetStudents.length === 0) {
        const skipParts = [];
        if (alreadySubmittedBcs.length > 0) skipParts.push(`${alreadySubmittedBcs.length} SV đã gửi`);
        if (unsubmittedSvCount > 0) skipParts.push(`${unsubmittedSvCount} SV chưa tự nộp`);
        notifyStat(
          `Không có sinh viên nào cần duyệt (đã bỏ qua ${skipParts.join(", ")}).`,
          true,
          false
        );
        return;
      }

      const ssoId = getSsoId(students);
      let idKhaoSat = null;
      let maxTemplate = null;
      let maxScore = -Infinity;

      for (const s of students) {
        for (const dc of s.diemCham || []) {
          if (!idKhaoSat && dc.idKhaoSat) idKhaoSat = dc.idKhaoSat;
          if (dc.danhSachTraLoi?.length > 0) {
            const score = dc.danhSachTraLoi.reduce((sum, a) => sum + (Number(a.traLoiText) || 0), 0);
            if (score > maxScore) {
              maxScore = score;
              maxTemplate = dc.danhSachTraLoi;
            }
          }
        }
      }

      if (!idKhaoSat) {
        throw new Error("Không thể xác định đợt khảo sát từ phiếu điểm lớp");
      }
      if (!maxTemplate || maxTemplate.length === 0) {
        throw new Error("Không thể xác định danh sách tiêu chí từ phiếu điểm lớp");
      }

      const maxAnswers = maxTemplate.map((a) => ({
        idCauHoi: a.idCauHoi,
        traLoiText: a.traLoiText || "0"
      }));

      const postHeaders = {
        "Content-Type": "application/json",
        ...headers
      };

      let successCount = 0;
      for (let idx = 0; idx < targetStudents.length; idx++) {
        if (isCancelled) break;

        const student = targetStudents[idx];
        const studentName = student.hoTen || student.maSinhVien || `SV #${idx + 1}`;
        notifyStat(`Đang ${actionDesc}: ${idx + 1}/${targetStudents.length} (${studentName})...`, false, false);

        const payload = {
          danhSachTraLoi: maxAnswers,
          guiNgay: submitDirectly,
          idDot: context.dotChamDiemId,
          idDotChamDiemRenLuyen: context.dotChamDiemId,
          idKhaoSat,
          nguoiTraLoi: "Ban cán sự",
          ssoId: ssoId || student.ssoId,
          ssoIdSinhVien: student.ssoId,
          trangThaiNopBCS: submitDirectly ? "Đã gửi" : "Lưu"
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
        const skipParts = [];
        if (alreadySubmittedBcs.length > 0) skipParts.push(`${alreadySubmittedBcs.length} SV đã gửi`);
        if (unsubmittedSvCount > 0) skipParts.push(`${unsubmittedSvCount} SV chưa nộp`);
        const skipNote = skipParts.length > 0 ? ` (bỏ qua ${skipParts.join(", ")})` : "";
        notifyStat(
          `Đã ${actionDesc} điểm tối đa cho ${successCount}/${targetStudents.length} sinh viên${skipNote}!`,
          true,
          false
        );
      }
    } catch (err) {
      notifyStat(err.message, true, true);
    } finally {
      isRunning = false;
      isCancelled = false;
    }
  };

  window.addEventListener("ptit-drl-trigger", (event) => {
    const submitDirectly = Boolean(event.detail?.submitDirectly);
    const includeUnsubmitted = Boolean(event.detail?.includeUnsubmitted);
    runBatchApiReview(submitDirectly, includeUnsubmitted);
  });
})();
