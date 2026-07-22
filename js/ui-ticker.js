// 종목 상세: 사다리 테이블 + 체결 기록 + 파라미터 편집

(function () {
  var symbol = new URLSearchParams(location.search).get("symbol");
  if (!symbol) {
    location.replace("index.html");
    return;
  }
  symbol = symbol.toUpperCase();

  document.getElementById("symbol-name").textContent = symbol;
  document.title = symbol + " — trading CCI";

  var notice = document.getElementById("notice");
  var ladderWrap = document.getElementById("ladder-wrap");
  var paramsForm = document.getElementById("params-form");
  var refreshInfo = document.getElementById("refresh-info");
  var currentPrice = null;
  var currentCci = null;

  function fmt(n, digits) {
    if (n === null || n === undefined || isNaN(n)) return "-";
    return n.toLocaleString("en-US", {
      minimumFractionDigits: digits === undefined ? 2 : digits,
      maximumFractionDigits: digits === undefined ? 2 : digits
    });
  }

  function getParams() {
    var pos = Store.getPosition(symbol);
    if (pos) return pos.params;
    var d = Store.getSettings().defaults;
    return Object.assign({}, d, { startPrice: currentPrice || 0, feePct: Store.getSettings().feePct });
  }

  function getFills() {
    var pos = Store.getPosition(symbol);
    return pos ? pos.fills : [];
  }

  // --- 파라미터 폼 ---

  function renderForm() {
    var p = Object.assign({}, Ladder.DEFAULTS, getParams());
    paramsForm.innerHTML =
      '<div class="field-row wide">' +
      field("시작가 $", "startPrice", p.startPrice, "decimal") +
      field("레벨 간격 %", "stepPct", p.stepPct, "decimal") +
      field("레벨 수", "levels", p.levels, "numeric") +
      "</div>" +
      '<div class="field-row wide">' +
      selectField("금액 방식", "amountMode", p.amountMode, [
        ["fixed", "레벨당 금액 직접 입력"],
        ["budget", "총예산 ÷ 레벨 수"],
        ["startBased", "시작가 × 계수"]
      ]) +
      field("레벨당 금액 $", "amountPerLevel", p.amountPerLevel, "decimal") +
      field("총예산 $", "totalBudget", p.totalBudget, "decimal") +
      "</div>" +
      '<div class="field-row wide">' +
      field("시작가 계수", "startFactor", p.startFactor, "decimal") +
      field("하위 레벨 배수", "multiplier", p.multiplier, "decimal") +
      field("목표 수익률 %", "targetPct", p.targetPct, "decimal") +
      "</div>";
  }

  function field(label, name, value, mode) {
    return '<label class="field"><span>' + label + "</span>" +
      '<input name="' + name + '" inputmode="' + mode + '" value="' + (value === 0 ? "" : value) + '"></label>';
  }

  function selectField(label, name, value, options) {
    return '<label class="field"><span>' + label + "</span>" +
      '<select name="' + name + '">' +
      options.map(function (o) {
        return '<option value="' + o[0] + '"' + (o[0] === value ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select></label>";
  }

  function readForm() {
    var p = Object.assign({}, getParams());
    paramsForm.querySelectorAll("input, select").forEach(function (el) {
      var v = el.tagName === "SELECT" ? el.value : parseFloat(el.value);
      if (el.tagName === "SELECT" || !isNaN(v)) p[el.name] = v;
    });
    p.levels = Math.max(1, Math.round(p.levels));
    p.feePct = Store.getSettings().feePct;
    return p;
  }

  // --- 사다리 테이블 ---

  function renderLadder() {
    var params = getParams();
    if (!params.startPrice) {
      ladderWrap.innerHTML = '<div class="notice" style="border:none;margin:0">시작가를 입력하면 사다리가 계산됩니다. (현재가 로드 후 "현재가를 시작가로" 버튼 사용 가능)</div>';
      document.getElementById("summary-bar").hidden = true;
      return;
    }
    var fills = getFills();
    var rows = Ladder.build(params, fills);
    var curIdx = Ladder.currentLevelIndex(rows, currentPrice);

    var html = '<table class="ladder"><thead><tr>' +
      "<th>레벨</th><th>체결</th><th>매수가</th><th>금액</th><th>수량</th><th>누적수량</th><th>누적평단</th><th>손익분기</th><th>목표매도가</th><th>예상수익</th>" +
      "</tr></thead><tbody>";

    rows.forEach(function (r) {
      var cls = [];
      if (r.filled) cls.push("filled");
      if (r.level === curIdx) cls.push("current");
      html += '<tr class="' + cls.join(" ") + '" data-level="' + r.level + '">' +
        "<td>L" + r.level + (r.level === curIdx ? " ◀" : "") + "</td>" +
        '<td><button class="fill-btn' + (r.filled ? " on" : "") + '" data-level="' + r.level + '">' +
        (r.filled ? "체결" : "미체결") + "</button>" +
        (r.filled ? '<button class="edit-btn" data-level="' + r.level + '" title="체결가/수량 수정">✎</button>' : "") +
        "</td>" +
        '<td class="num">$' + fmt(r.filled ? r.price : r.planPrice) + "</td>" +
        '<td class="num">$' + fmt(r.amount, 0) + "</td>" +
        '<td class="num">' + r.qty + "</td>" +
        '<td class="num">' + r.cumQty + "</td>" +
        '<td class="num">$' + fmt(r.avg) + "</td>" +
        '<td class="num">$' + fmt(r.breakEven) + "</td>" +
        '<td class="num">$' + fmt(r.sellPrice) + "</td>" +
        '<td class="num">$' + fmt(r.profit) + "</td>" +
        "</tr>";
    });
    html += "</tbody></table>";
    ladderWrap.innerHTML = html;

    ladderWrap.querySelectorAll(".fill-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var level = parseInt(btn.dataset.level, 10);
        ensurePosition();
        var row = rows[level];
        Store.toggleFill(symbol, level, row.planPrice, roundQty(row.planAmount / row.planPrice));
        renderAll();
      });
    });

    ladderWrap.querySelectorAll(".edit-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var level = parseInt(btn.dataset.level, 10);
        var fill = getFills().find(function (f) { return f.level === level; });
        if (!fill) return;
        var priceStr = prompt("L" + level + " 실제 체결가 ($)", fill.price);
        if (priceStr === null) return;
        var qtyStr = prompt("L" + level + " 실제 체결 수량 (주)", fill.qty);
        if (qtyStr === null) return;
        var price = parseFloat(priceStr);
        var qty = parseFloat(qtyStr);
        if (isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) {
          alert("숫자를 확인해주세요.");
          return;
        }
        Store.updateFill(symbol, level, price, qty);
        renderAll();
      });
    });

    renderSummary(params, fills);
  }

  function roundQty(qty) {
    var params = getParams();
    return params.fractional ? Math.floor(qty * 10000) / 10000 : Math.floor(qty);
  }

  function ensurePosition() {
    if (!Store.getPosition(symbol)) {
      Store.savePosition(symbol, { params: getParams(), fills: [], status: "active" });
    }
  }

  function renderSummary(params, fills) {
    var bar = document.getElementById("summary-bar");
    var pos = Ladder.position(params, fills, currentPrice);
    if (!pos) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    document.getElementById("sb-avg").textContent = "$" + fmt(pos.avg);
    document.getElementById("sb-cost").textContent = "$" + fmt(pos.cost, 0);
    var pnlEl = document.getElementById("sb-pnl");
    if (pos.pnl !== undefined) {
      pnlEl.textContent = (pos.pnl >= 0 ? "+" : "") + fmt(pos.pnl, 0) + " (" + fmt(pos.pnlPct, 1) + "%)";
      pnlEl.style.color = pos.pnl >= 0 ? "var(--up)" : "var(--down)";
    } else {
      pnlEl.textContent = "-";
    }
    document.getElementById("sb-target").textContent =
      pos.toTargetPct !== undefined ? "$" + fmt(pos.sellPrice) + " (+" + fmt(pos.toTargetPct, 1) + "%)" : "$" + fmt(pos.sellPrice);
  }

  function renderHead(summary) {
    document.getElementById("price-big").textContent = summary ? "$" + fmt(summary.price) : "-";
    var sub = document.getElementById("head-sub");
    if (summary) {
      var chCls = summary.changePct >= 0 ? "up" : "down";
      sub.innerHTML = '<span class="change ' + chCls + '">' +
        (summary.changePct >= 0 ? "+" : "") + fmt(summary.changePct) + "%</span><br>" +
        "CCI(20) " + fmt(summary.cci, 0);
    }
  }

  function renderAll() {
    renderLadder();
  }

  // --- 데이터 로드 ---

  async function load(force) {
    var settings = Store.getSettings();
    notice.innerHTML = "";
    if (!settings.apiKey) {
      notice.innerHTML = '<div class="notice">Twelve Data API 키가 없습니다. <a href="settings.html">설정</a>에서 입력하면 시세와 CCI가 표시됩니다. 사다리 계산은 키 없이도 사용할 수 있습니다.</div>';
      renderForm();
      renderLadder();
      return;
    }
    refreshInfo.textContent = "갱신 중...";
    try {
      var summary = await API.getSummary(symbol, settings.candleInterval, force);
      currentPrice = summary.price;
      currentCci = summary.cci;
      // 상세 화면은 단건 quote로 가격을 더 신선하게 (1 credit, TTL 60초)
      try {
        var quote = await API.getQuote(symbol, force);
        currentPrice = quote.price;
        summary.price = quote.price;
        summary.changePct = quote.changePct;
      } catch (e) { /* series 가격으로 대체 */ }
      renderHead(summary);
      var open = API.marketOpen();
      refreshInfo.innerHTML = (open ? "" : '<span class="market-closed">장 마감</span> · ') +
        "마지막 갱신 " + new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      notice.innerHTML = '<div class="notice error">' + e.message + "</div>";
      refreshInfo.textContent = "갱신 실패";
    }
    renderForm();
    renderLadder();
  }

  // --- 이벤트 ---

  document.getElementById("save-params").addEventListener("click", function () {
    var p = readForm();
    if (!p.startPrice || p.startPrice <= 0) {
      alert("시작가를 입력해주세요.");
      return;
    }
    var pos = Store.getPosition(symbol) || { fills: [], status: "active" };
    pos.params = p;
    pos.status = "active";
    Store.savePosition(symbol, pos);
    renderForm();
    renderLadder();
  });

  document.getElementById("use-current-price").addEventListener("click", function () {
    if (!currentPrice) {
      alert("현재가가 아직 로드되지 않았습니다.");
      return;
    }
    var input = paramsForm.querySelector('input[name="startPrice"]');
    if (input) input.value = currentPrice;
  });

  document.getElementById("close-position").addEventListener("click", function () {
    var pos = Store.getPosition(symbol);
    if (!pos) return;
    if (!confirm(symbol + " 포지션 기록을 삭제할까요? (체결 기록 " + pos.fills.length + "건)")) return;
    Store.deletePosition(symbol);
    renderForm();
    renderLadder();
  });

  document.getElementById("refresh-btn").addEventListener("click", function () { load(true); });

  // --- TradingView 위젯 (탭 시에만 lazy load) ---

  var tvLoaded = false;
  document.getElementById("tv-toggle").addEventListener("click", function () {
    var container = document.getElementById("tv-widget");
    if (tvLoaded) {
      container.innerHTML = "";
      tvLoaded = false;
      this.textContent = "TradingView 차트 보기";
      return;
    }
    tvLoaded = true;
    this.textContent = "차트 닫기";
    var isDark = (document.documentElement.getAttribute("data-theme") || "dark") !== "light";
    container.innerHTML = '<div class="tv-container"><div id="tv-inner" style="height:100%"></div></div>';
    var script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.onload = function () {
      new TradingView.widget({
        container_id: "tv-inner",
        symbol: symbol,
        interval: "D",
        timezone: "America/New_York",
        theme: isDark ? "dark" : "light",
        locale: "kr",
        autosize: true,
        studies: ["CCI@tv-basicstudies"],
        hide_side_toolbar: true
      });
    };
    document.body.appendChild(script);
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) load(false);
  });

  // 포지션이 이미 진행 중이면 설정은 접고 사다리 테이블을 바로 보여준다
  document.getElementById("params-section").open =
    !getParams().startPrice || getFills().length === 0;

  renderForm();
  renderLadder();
  load(false);
})();
