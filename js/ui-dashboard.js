// 대시보드: "오늘 할 일" 배너 + 종목 카드

(function () {
  var grid = document.getElementById("ticker-grid");
  var banner = document.getElementById("todo-banner");
  var notice = document.getElementById("notice");
  var refreshInfo = document.getElementById("refresh-info");
  var refreshBtn = document.getElementById("refresh-btn");

  function fmt(n, digits) {
    if (n === null || n === undefined || isNaN(n)) return "-";
    return n.toLocaleString("en-US", {
      minimumFractionDigits: digits === undefined ? 2 : digits,
      maximumFractionDigits: digits === undefined ? 2 : digits
    });
  }

  function zoneBadge(cci) {
    var zone = CCI.zone(cci);
    var label = { entry: "진입 구간", oversold: "과매도", neutral: "관망", unknown: "-" }[zone];
    return '<span class="badge ' + zone + '">' + label + "</span>";
  }

  // 종목 상태 판정 → { priority, badge, msg } (priority: 낮을수록 상단)
  function evaluate(symbol, summary) {
    var pos = Store.getPosition(symbol);
    var active = pos && pos.status === "active" && pos.fills.length > 0;

    if (active) {
      var rows = Ladder.build(pos.params, pos.fills);
      var position = Ladder.position(pos.params, pos.fills, summary.price);
      if (summary.price >= position.sellPrice) {
        return { priority: 0, badge: '<span class="badge sell">목표 도달</span>',
          msg: "목표 매도가 $" + fmt(position.sellPrice) + " 도달 (평단 대비 " + fmt(position.pnlPct, 1) + "%)" };
      }
      var next = Ladder.nextBuy(rows, summary.price);
      if (next && next.reached) {
        return { priority: 1, badge: '<span class="badge buy">매수 레벨</span>',
          msg: "L" + next.level + " 매수가 $" + fmt(next.price) + " 도달 (계획 $" + fmt(next.amount, 0) + ")" };
      }
      var parts = ["평단 $" + fmt(position.avg) + " (" + (position.pnlPct >= 0 ? "+" : "") + fmt(position.pnlPct, 1) + "%)"];
      if (next) parts.push("다음 매수 $" + fmt(next.price) + " (-" + fmt(next.distancePct, 1) + "% 남음)");
      return { priority: 3, badge: '<span class="badge neutral">보유 중</span>', msg: parts.join(" · ") };
    }

    var zone = CCI.zone(summary.cci);
    if (zone === "entry") {
      return { priority: 2, badge: zoneBadge(summary.cci),
        msg: "CCI " + fmt(summary.cci, 0) + " — 진입 구간 (-50~-100). 사다리 설정하려면 탭" };
    }
    if (zone === "oversold") {
      return { priority: 2, badge: zoneBadge(summary.cci),
        msg: "CCI " + fmt(summary.cci, 0) + " — -100 이하 과매도" };
    }
    return { priority: 4, badge: zoneBadge(summary.cci), msg: "CCI " + fmt(summary.cci, 0) + " — 관망" };
  }

  function renderCard(symbol, summary, evalResult) {
    var pos = Store.getPosition(symbol);
    var active = pos && pos.status === "active" && pos.fills.length > 0;
    var posLine = "";
    if (active && summary) {
      var p = Ladder.position(pos.params, pos.fills, summary.price);
      posLine = '<div class="row3 num">보유 ' + p.qty + "주 · 평단 $" + fmt(p.avg) +
        ' · <span class="change ' + (p.pnl >= 0 ? "up" : "down") + '">' +
        (p.pnl >= 0 ? "+" : "") + fmt(p.pnl) + " (" + fmt(p.pnlPct, 1) + "%)</span></div>";
    }
    var changeCls = summary && summary.changePct >= 0 ? "up" : "down";
    return '<a class="ticker-card" href="ticker.html?symbol=' + symbol + '">' +
      '<div class="row1"><span class="symbol">' + symbol + '</span>' +
      '<span class="price num">' + (summary ? "$" + fmt(summary.price) : "-") + "</span></div>" +
      '<div class="row2">' +
      '<span class="change num ' + changeCls + '">' +
      (summary && summary.changePct !== null ? (summary.changePct >= 0 ? "+" : "") + fmt(summary.changePct) + "%" : "-") +
      "</span>" +
      '<span class="num">CCI ' + (summary ? fmt(summary.cci, 0) : "-") + " " + (evalResult ? evalResult.badge : "") + "</span>" +
      "</div>" + posLine + "</a>";
  }

  function renderTodo(items) {
    banner.innerHTML = items.map(function (it) {
      return '<a class="todo-item" href="ticker.html?symbol=' + it.symbol + '">' +
        '<span class="sym">' + it.symbol + "</span>" + it.badge +
        '<span class="msg">' + it.msg + "</span></a>";
    }).join("");
  }

  async function load(force) {
    var settings = Store.getSettings();
    notice.innerHTML = "";

    if (!settings.apiKey) {
      notice.innerHTML = '<div class="notice">Twelve Data API 키가 없습니다. <a href="settings.html">설정</a>에서 입력하면 시세와 CCI가 표시됩니다.</div>';
      grid.innerHTML = settings.symbols.map(function (s) { return renderCard(s, null, null); }).join("");
      refreshInfo.textContent = "API 키 필요";
      return;
    }

    refreshInfo.textContent = "갱신 중...";
    var items = [];
    var cards = {};

    // 순차 호출 — 분당 크레딧 예산은 api.js가 관리
    for (var i = 0; i < settings.symbols.length; i++) {
      var symbol = settings.symbols[i];
      try {
        var summary = await API.getSummary(symbol, settings.candleInterval, force);
        var ev = evaluate(symbol, summary);
        items.push(Object.assign({ symbol: symbol }, ev));
        cards[symbol] = renderCard(symbol, summary, ev);
      } catch (e) {
        cards[symbol] = renderCard(symbol, null, null);
        if (e.message !== "NO_API_KEY") {
          notice.innerHTML = '<div class="notice error">' + symbol + ": " + e.message + "</div>";
        }
      }
      grid.innerHTML = settings.symbols.map(function (s) {
        return cards[s] || renderCard(s, null, null);
      }).join("");
    }

    items.sort(function (a, b) { return a.priority - b.priority; });
    renderTodo(items);

    var open = API.marketOpen();
    refreshInfo.innerHTML = (open ? "" : '<span class="market-closed">장 마감</span> · ') +
      "마지막 갱신 " + new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }

  refreshBtn.addEventListener("click", function () { load(true); });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) load(false);
  });

  load(false);
})();
