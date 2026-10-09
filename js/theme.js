  // Theme init (runs early, before main script) — reads persisted choice or system default
  (function initTheme() {
    let choice = null;
    try { choice = localStorage.getItem("ar_dashboard_theme"); } catch(e) {}
    if (choice === "light" || choice === "dark") {
      document.documentElement.setAttribute("data-theme", choice);
    }
    function reflectButtons() {
      const cur = document.documentElement.getAttribute("data-theme")
        || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.querySelectorAll(".theme-toggle button").forEach(b => {
        b.classList.toggle("active", b.dataset.themeChoice === cur);
      });
    }
    function bindButtons() {
      document.querySelectorAll(".theme-toggle button").forEach(b => {
        b.addEventListener("click", () => {
          const c = b.dataset.themeChoice;
          document.documentElement.setAttribute("data-theme", c);
          try { localStorage.setItem("ar_dashboard_theme", c); } catch(e) {}
          reflectButtons();
        });
      });
      reflectButtons();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bindButtons);
    } else {
      bindButtons();
    }
  })();

  // Language toggle bindings
  (function initLang() {
    function bind() {
      document.querySelectorAll(".lang-toggle button").forEach(b => {
        b.addEventListener("click", () => setLang(b.dataset.langChoice));
      });
      if (typeof applyLang === "function") applyLang();
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
    else bind();
  })();

  // Password eye toggle
  (function initEye() {
    function bind() {
      const btn = document.getElementById("toggle-pw");
      const inp = document.getElementById("pw");
      if (!btn || !inp || btn._bound) return;
      btn._bound = true;
      btn.addEventListener("click", () => {
        const shown = inp.type === "text";
        inp.type = shown ? "password" : "text";
        const openIcn = btn.querySelector("#eye-open");
        const closedIcn = btn.querySelector("#eye-closed");
        if (openIcn && closedIcn) {
          openIcn.style.display   = shown ? "" : "none";
          closedIcn.style.display = shown ? "none" : "";
        }
        btn.setAttribute("aria-label", shown ? "إظهار الرمز" : "إخفاء الرمز");
        inp.focus();
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
    else bind();
  })();
