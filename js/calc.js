// 분할매수 사다리 계산 — 입력 3개로 표 렌더
(function () {
  var LEVELS = 15; // 표시할 하락 단계 수
  var startEl = document.getElementById("startPrice");
  var amountEl = document.getElementById("buyAmount");
  var stepEl = document.getElementById("stepPct");
  var tbody = document.querySelector("#ladder tbody");

  function fmt(n, digits) {
    if (n === null || isNaN(n)) return "-";
    return n.toLocaleString("en-US", {
      minimumFractionDigits: digits, maximumFractionDigits: digits
    });
  }

  function render() {
    var start = parseFloat(startEl.value);
    var amount = parseFloat(amountEl.value);
    var step = parseFloat(stepEl.value);

    localStorage.setItem("cci_calc", JSON.stringify({
      start: startEl.value, amount: amountEl.value, step: stepEl.value
    }));

    if (!start || !amount || !step) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">시작가와 1회 매수 금액을 입력하세요</td></tr>';
      return;
    }

    var rows = "";
    var cumQty = 0;
    var cumCost = 0;
    for (var i = 0; i < LEVELS; i++) {
      var drop = i * step;
      var price = start * (1 - drop / 100);
      var qty = amount / price;
      cumQty += qty;
      cumCost += qty * price;
      var avg = cumCost / cumQty;
      rows += "<tr>" +
        "<td>" + (i === 0 ? "시작" : "-" + fmt(drop, 0) + "%") + "</td>" +
        '<td class="num">$' + fmt(price, 2) + "</td>" +
        '<td class="num">$' + fmt(amount, 0) + "</td>" +
        '<td class="num">' + fmt(qty, 2) + "</td>" +
        '<td class="num">' + fmt(cumQty, 2) + "</td>" +
        '<td class="num">$' + fmt(avg, 2) + "</td>" +
        "</tr>";
    }
    tbody.innerHTML = rows;
  }

  // 마지막 입력값 복원
  try {
    var saved = JSON.parse(localStorage.getItem("cci_calc"));
    if (saved) {
      startEl.value = saved.start || "";
      amountEl.value = saved.amount || "";
      stepEl.value = saved.step || "1";
    }
  } catch (e) {}

  [startEl, amountEl, stepEl].forEach(function (el) {
    el.addEventListener("input", render);
  });
  render();
})();
