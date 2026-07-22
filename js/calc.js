// 분할매수 사다리 계산
// 가격 ①-② 차이 = 1회 매수 금액, 매수가 기준 1%씩 하락한 가격표
(function () {
  var LEVELS = 15; // 표시할 하락 단계 수
  var p1El = document.getElementById("price1");
  var p2El = document.getElementById("price2");
  var buyPriceEl = document.getElementById("buyPrice");
  var amountView = document.getElementById("buyAmountView");
  var tbody = document.querySelector("#ladder tbody");

  function fmt(n, digits) {
    if (n === null || isNaN(n)) return "-";
    return n.toLocaleString("en-US", {
      minimumFractionDigits: digits, maximumFractionDigits: digits
    });
  }

  function render() {
    var p1 = parseFloat(p1El.value);
    var p2 = parseFloat(p2El.value);
    var base = parseFloat(buyPriceEl.value);

    localStorage.setItem("cci_calc", JSON.stringify({
      p1: p1El.value, p2: p2El.value, buyPrice: buyPriceEl.value
    }));

    var amount = (!isNaN(p1) && !isNaN(p2)) ? Math.abs(p1 - p2) : NaN;
    amountView.textContent = isNaN(amount) || amount === 0 ? "-" : "$" + fmt(amount, 2);

    if (isNaN(amount) || amount === 0 || !base) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty">가격 ①·②와 매수가를 입력하세요</td></tr>';
      return;
    }

    var rows = "";
    for (var i = 0; i < LEVELS; i++) {
      var price = base * (1 - i / 100);
      rows += "<tr>" +
        "<td>" + (i === 0 ? "시작" : "-" + i + "%") + "</td>" +
        '<td class="num">$' + fmt(price, 2) + "</td>" +
        '<td class="num">$' + fmt(amount, 2) + "</td>" +
        "</tr>";
    }
    tbody.innerHTML = rows;
  }

  // 마지막 입력값 복원
  try {
    var saved = JSON.parse(localStorage.getItem("cci_calc"));
    if (saved) {
      p1El.value = saved.p1 || "";
      p2El.value = saved.p2 || "";
      buyPriceEl.value = saved.buyPrice || "";
    }
  } catch (e) {}

  [p1El, p2El, buyPriceEl].forEach(function (el) {
    el.addEventListener("input", render);
  });
  render();
})();
