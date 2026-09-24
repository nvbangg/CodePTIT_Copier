(() => {
  "use strict";

  const isHideActive = () => {
    try {
      return (document.documentElement?.dataset?.hideGrades ?? sessionStorage.getItem("ptit_hideGrades")) === "true";
    } catch {
      return false;
    }
  };

  const domainStrategies = {
    "db.ptit.edu.vn": {
      isTarget: (url) => url.includes("/api/auth/schedule/grades"),
      mockResponse: () => "[]",
    },
    "qldt.ptit.edu.vn": {
      isTarget: (url) => url.includes("srm/w-locdsdiemsinhvien") || url.includes("dkmh/w-inketquahoctap"),
      transform: (url, body) => {
        try {
          const json = typeof body === "string" ? JSON.parse(body) : body;
          if (!json?.data) return json;

          if (url.includes("w-locdsdiemsinhvien")) {
            json.data.an_chi_tiet_diem_tp = true;
            json.data.dtb_tich_luy_he_10 = "";
            json.data.dtb_tich_luy_he_4 = "";
            json.data.diem_trung_binh_tich_luy = "";

            json.data.ds_diem_hocky?.forEach((hk) => {
              hk.dtb_hk_he10 = "";
              hk.dtb_hk_he4 = "";
              hk.dtb_tich_luy_he_10 = "";
              hk.dtb_tich_luy_he_4 = "";
              hk.so_tin_chi_dat_hk = "";
              hk.so_tin_chi_dat_tich_luy = "";
              hk.xep_loai_tkb_hk = "";
              hk.xep_loai_tkb_hk_eg = "";
              hk.canh_cao_hoc_tap = "";
              hk.canh_cao_hoc_tap_eg = "";

              hk.ds_diem_mon_hoc?.forEach((sub) => {
                sub.diem_chuyen_can = "";
                sub.diem_giua_ky = "";
                sub.diem_thuc_hanh = "";
                sub.diem_bai_tap = "";
                sub.diem_thi = "";
                sub.diem_tk = "";
                sub.diem_tk_so = "";
                sub.diem_tk_chu = "";
                sub.ket_qua = "";
                sub.hien_thi_ket_qua = false;
                sub.ds_diem_thanh_phan?.forEach((tp) => {
                  tp.diem_thanh_phan = "";
                });
              });
            });
          } else if (url.includes("w-inketquahoctap")) {
            json.data.ds_du_lieu?.forEach((item) => {
              if (item) {
                item.diem_trung_binh1 = 0;
                item.diem_trung_binh2 = 0;
              }
            });
          }
          return json;
        } catch {
          return body;
        }
      },
    },
  };

  const strategy = domainStrategies[window.location.hostname];
  if (!strategy) return;

  const resolvePayload = (url, raw) => {
    if (strategy.mockResponse) return strategy.mockResponse(url);
    if (!strategy.transform) return raw;
    const transformed = strategy.transform(url, raw);
    return typeof transformed === "string" ? transformed : JSON.stringify(transformed);
  };

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : (args[0]?.url || args[0]?.href || "");
    if (!strategy.isTarget(url)) return origFetch.apply(this, args);

    if (strategy.mockResponse) {
      return isHideActive()
        ? new Response(strategy.mockResponse(url), { status: 200, headers: { "Content-Type": "application/json" } })
        : origFetch.apply(this, args);
    }

    const res = await origFetch.apply(this, args);
    if (!isHideActive()) return res;

    try {
      const json = await res.clone().json();
      return new Response(resolvePayload(url, json), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    } catch {
      return res;
    }
  };

  if (typeof XMLHttpRequest !== "undefined") {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      this.__url = typeof url === "string" ? url : (url?.toString?.() || "");
      return origOpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      const targetUrl = this.__url;
      if (strategy.isTarget(targetUrl)) {
        this.addEventListener(
          "readystatechange",
          function () {
            if (this.readyState === 4 && this.status === 200 && isHideActive()) {
              const mockedText = resolvePayload(targetUrl, this.responseText);
              let parsedJson = mockedText;
              try {
                parsedJson = JSON.parse(mockedText);
              } catch {}
              try {
                Object.defineProperty(this, "responseText", { value: mockedText, configurable: true });
                Object.defineProperty(this, "response", {
                  value: this.responseType === "json" ? parsedJson : mockedText,
                  configurable: true,
                });
              } catch {}
            }
          },
          true
        );
      }
      return origSend.apply(this, args);
    };
  }
})();
