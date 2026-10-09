  // مؤشر وضع الاتصال (يظهر بعد تحميل السكربت الرئيسي)
  setTimeout(() => {
    const el = document.getElementById("mode-indicator");
    if (!el) return;
    if (typeof USE_FIREBASE !== "undefined" && USE_FIREBASE) {
      el.innerHTML = "☁️ " + t("firebase_on");
      el.style.color = "var(--positive)";
    } else {
      el.innerHTML = "⚠️ " + t("firebase_off") + "<br><span style='font-size:10px;'>" + t("firebase_off_hint") + "</span>";
      el.style.color = "var(--negative)";
      const btn = document.getElementById("unlock");
      if (btn) { btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed"; }
    }
  }, 100);
