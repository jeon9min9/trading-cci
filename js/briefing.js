// 탭 전환 + 브리핑(data/briefing.json) 렌더
(function () {
  var sections = { calc: document.getElementById("tab-calc"), brief: document.getElementById("tab-brief") };
  var tabs = document.querySelectorAll(".tabs .tab");
  var loaded = false;

  function switchTab(name) {
    tabs.forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.tab === name);
    });
    sections.calc.hidden = name !== "calc";
    sections.brief.hidden = name !== "brief";
    localStorage.setItem("cci_tab", name);
    if (name === "brief" && !loaded) loadBriefing();
  }

  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () { switchTab(btn.dataset.tab); });
  });

  var MOOD = { red: "위험/급락", yellow: "중립/관망", green: "양호/반등" };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function render(data) {
    var box = document.getElementById("briefing");
    box.innerHTML = "";

    var head = el("div", "brief-head");
    head.appendChild(el("strong", null, data.date + " 브리핑"));
    if (data.note) head.appendChild(el("span", "brief-note", data.note));
    box.appendChild(head);

    (data.items || []).forEach(function (item) {
      var card = el("article", "brief-card");
      var title = el("div", "brief-title");
      title.appendChild(el("span", "dot " + (item.mood || "yellow")));
      title.appendChild(el("strong", null, item.symbol));
      if (item.title) title.appendChild(el("span", "brief-sub", item.title));
      card.appendChild(title);
      card.appendChild(el("p", "brief-body", item.body));
      box.appendChild(card);
    });

    if (data.sources && data.sources.length) {
      var src = el("div", "brief-sources");
      src.appendChild(el("span", null, "출처: "));
      data.sources.forEach(function (s, i) {
        if (i > 0) src.appendChild(document.createTextNode(" · "));
        var a = el("a", null, s.title);
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noopener";
        src.appendChild(a);
      });
      box.appendChild(src);
    }

    box.appendChild(el("p", "hint", "공개 정보 요약이며 투자 권유·자문이 아닙니다. 매매 판단의 책임은 사용자에게 있습니다."));
  }

  function loadBriefing() {
    loaded = true;
    fetch("data/briefing.json?t=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(render)
      .catch(function () {
        document.getElementById("briefing").innerHTML =
          '<p class="hint">아직 브리핑이 없습니다. Claude Code에서 "브리핑 업데이트해줘"라고 요청하면 생성됩니다.</p>';
      });
  }

  var savedTab = localStorage.getItem("cci_tab");
  if (savedTab === "brief") switchTab("brief");
})();
