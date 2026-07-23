// 분할매수 사다리 계산
// 1회 매수 금액 = 매수가 × 1%, 매수가 기준 1%씩 하락한 가격표
(function () {
  var LEVELS = 15; // 표시할 하락 단계 수
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
    var base = parseFloat(buyPriceEl.value);

    localStorage.setItem("cci_calc", JSON.stringify({ buyPrice: buyPriceEl.value }));

    if (!base) {
      amountView.textContent = "-";
      tbody.innerHTML = '<tr><td colspan="3" class="empty">매수가를 입력하세요</td></tr>';
      return;
    }

    var amount = base * 0.01;
    amountView.textContent = "$" + fmt(amount, 2);

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
    if (saved) buyPriceEl.value = saved.buyPrice || "";
  } catch (e) {}

  buyPriceEl.addEventListener("input", render);
  render();
})();
