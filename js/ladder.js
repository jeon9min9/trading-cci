// 분할매수 사다리 계산 — 순수 함수, DOM/외부 의존 없음
//
// params:
//   startPrice     첫 매수가 P0
//   stepPct        레벨 간격 % (기본 1)
//   stepMode       "arithmetic"(P0 기준 등차, 기본) | "geometric"(직전 레벨 대비)
//   levels         레벨 수 N (L0 = 시작 매수 포함, 기본 10)
//   amountMode     "fixed" | "budget" | "startBased"
//   amountPerLevel fixed 모드: 레벨당 금액
//   totalBudget    budget 모드: 총예산 (레벨별 배분 후 합계가 이 값이 되도록 정규화)
//   startFactor    startBased 모드: 레벨당 금액 = P0 × k
//   multiplier     하위 레벨 가중 배수 (기본 1 = 균등)
//   targetPct      목표 수익률 % (기본 3)
//   feePct         왕복 수수료율 % (기본 0.2)
//   fractional     소수점 수량 허용 (기본 false → 정수 주)
// fills: [{ level, price, qty, ts }] 실제 체결 기록

var Ladder = (function () {
  var DEFAULTS = {
    stepPct: 1,
    stepMode: "arithmetic",
    levels: 10,
    amountMode: "fixed",
    amountPerLevel: 100,
    totalBudget: 1000,
    startFactor: 0.15,
    multiplier: 1,
    targetPct: 3,
    feePct: 0.2,
    fractional: false
  };

  function levelPrice(p, i) {
    if (p.stepMode === "geometric") {
      return p.startPrice * Math.pow(1 - p.stepPct / 100, i);
    }
    return p.startPrice * (1 - (i * p.stepPct) / 100);
  }

  // 모드별 레벨 금액 배열 (multiplier 가중 포함)
  function amounts(p) {
    var base;
    if (p.amountMode === "budget") base = p.totalBudget / p.levels;
    else if (p.amountMode === "startBased") base = p.startPrice * p.startFactor;
    else base = p.amountPerLevel;

    var arr = [];
    for (var i = 0; i < p.levels; i++) {
      arr.push(base * Math.pow(p.multiplier, i));
    }
    if (p.amountMode === "budget") {
      var sum = arr.reduce(function (a, b) { return a + b; }, 0);
      arr = arr.map(function (v) { return (v / sum) * p.totalBudget; });
    }
    return arr;
  }

  function roundQty(qty, fractional) {
    return fractional ? Math.floor(qty * 10000) / 10000 : Math.floor(qty);
  }

  // 사다리 전체 계산. 체결된 레벨은 실제 체결값, 미체결 레벨은 계획값으로 누적
  function build(params, fills) {
    var p = Object.assign({}, DEFAULTS, params);
    fills = fills || [];
    var amts = amounts(p);
    var rows = [];
    var cumQty = 0;
    var cumCost = 0;

    for (var i = 0; i < p.levels; i++) {
      var planPrice = levelPrice(p, i);
      var planQty = roundQty(amts[i] / planPrice, p.fractional);
      var fill = null;
      for (var f = 0; f < fills.length; f++) {
        if (fills[f].level === i) { fill = fills[f]; break; }
      }
      var price = fill ? fill.price : planPrice;
      var qty = fill ? fill.qty : planQty;

      cumQty += qty;
      cumCost += qty * price;
      var avg = cumQty > 0 ? cumCost / cumQty : 0;
      var breakEven = avg * (1 + p.feePct / 100);
      var sellPrice = avg * (1 + p.targetPct / 100);
      var profit = cumQty * (sellPrice - avg) - cumCost * (p.feePct / 100);

      rows.push({
        level: i,
        planPrice: planPrice,
        planAmount: amts[i],
        price: price,
        qty: qty,
        amount: qty * price,
        cumQty: cumQty,
        cumCost: cumCost,
        avg: avg,
        breakEven: breakEven,
        sellPrice: sellPrice,
        profit: profit,
        filled: !!fill,
        fill: fill
      });
    }
    return rows;
  }

  // 실제 체결 기록만으로 현재 포지션 요약
  function position(params, fills, currentPrice) {
    var p = Object.assign({}, DEFAULTS, params);
    fills = fills || [];
    var qty = 0;
    var cost = 0;
    fills.forEach(function (f) {
      qty += f.qty;
      cost += f.qty * f.price;
    });
    if (qty === 0) return null;
    var avg = cost / qty;
    var sellPrice = avg * (1 + p.targetPct / 100);
    var pos = {
      qty: qty,
      cost: cost,
      avg: avg,
      breakEven: avg * (1 + p.feePct / 100),
      sellPrice: sellPrice
    };
    if (currentPrice) {
      pos.value = qty * currentPrice;
      pos.pnl = pos.value - cost;
      pos.pnlPct = ((currentPrice - avg) / avg) * 100;
      pos.toTargetPct = ((sellPrice - currentPrice) / currentPrice) * 100;
    }
    return pos;
  }

  // 다음 매수 대상 = 미체결 레벨 중 가장 위(인덱스가 가장 낮은) 레벨
  function nextBuy(rows, currentPrice) {
    for (var i = 0; i < rows.length; i++) {
      if (!rows[i].filled) {
        var r = rows[i];
        var out = { level: r.level, price: r.planPrice, amount: r.planAmount };
        if (currentPrice) {
          out.distancePct = ((currentPrice - r.planPrice) / currentPrice) * 100;
          out.reached = currentPrice <= r.planPrice;
        }
        return out;
      }
    }
    return null;
  }

  // 현재가가 위치한 레벨 인덱스 (rows[i].planPrice >= price > rows[i+1].planPrice)
  function currentLevelIndex(rows, currentPrice) {
    if (!currentPrice || !rows.length) return -1;
    if (currentPrice > rows[0].planPrice) return -1;
    for (var i = 0; i < rows.length; i++) {
      var next = rows[i + 1];
      if (currentPrice <= rows[i].planPrice && (!next || currentPrice > next.planPrice)) {
        return i;
      }
    }
    return rows.length - 1;
  }

  return {
    DEFAULTS: DEFAULTS,
    build: build,
    position: position,
    nextBuy: nextBuy,
    currentLevelIndex: currentLevelIndex,
    levelPrice: levelPrice,
    amounts: amounts
  };
})();

if (typeof module !== "undefined") module.exports = Ladder;
