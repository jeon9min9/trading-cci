(function () {
  var toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;

  // CSS 기본 테마가 다크이므로 속성이 없으면 다크로 판단
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function updateIcon() {
    toggle.textContent = currentTheme() === "dark" ? "☀️" : "🌙";
  }

  toggle.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("cci_theme", next);
    updateIcon();
  });

  updateIcon();
})();
