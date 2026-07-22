// CCI(Commodity Channel Index) 계산 — 순수 함수, DOM/외부 의존 없음
// candles: [{ high, low, close }] 과거 → 최신 순서

var CCI = (function () {
  // 전체 구간 CCI 배열 반환 (앞쪽 period-1개는 null)
  function series(candles, period) {
    period = period || 20;
    var tps = candles.map(function (c) {
      return (c.high + c.low + c.close) / 3;
    });
    var out = [];
    for (var i = 0; i < tps.length; i++) {
      if (i < period - 1) {
        out.push(null);
        continue;
      }
      var sum = 0;
      for (var j = i - period + 1; j <= i; j++) sum += tps[j];
      var sma = sum / period;
      var dev = 0;
      for (var k = i - period + 1; k <= i; k++) dev += Math.abs(tps[k] - sma);
      var meanDev = dev / period;
      out.push(meanDev === 0 ? 0 : (tps[i] - sma) / (0.015 * meanDev));
    }
    return out;
  }

  // 최신 CCI 값 하나만 반환 (데이터 부족 시 null)
  function latest(candles, period) {
    var s = series(candles, period);
    return s.length ? s[s.length - 1] : null;
  }

  // CCI 값 → 전략 구간 라벨
  function zone(value) {
    if (value === null || value === undefined || isNaN(value)) return "unknown";
    if (value < -100) return "oversold";   // 과매도
    if (value <= -50) return "entry";      // 진입 구간 (-50 ~ -100)
    return "neutral";                      // 관망
  }

  return { series: series, latest: latest, zone: zone };
})();

if (typeof module !== "undefined") module.exports = CCI;
