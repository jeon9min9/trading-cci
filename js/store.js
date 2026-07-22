// localStorage 스키마 + 내보내기/가져오기 — DOM 의존 없음
//
// sl_settings: { apiKey, candleInterval, feePct, symbols, defaults }
// sl_positions: { SOXL: { params, fills: [{level, price, qty, ts}], status, updatedAt } }

var Store = (function () {
  var SETTINGS_KEY = "sl_settings";
  var POSITIONS_KEY = "sl_positions";

  var DEFAULT_SETTINGS = {
    apiKey: "",
    candleInterval: "1day",
    feePct: 0.2,
    symbols: ["SOXL", "BITX", "TQQQ", "SPXL", "QLD"],
    defaults: {
      stepPct: 1,
      stepMode: "arithmetic",
      levels: 10,
      amountMode: "fixed",
      amountPerLevel: 100,
      totalBudget: 1000,
      startFactor: 0.15,
      multiplier: 1,
      targetPct: 3,
      fractional: false
    }
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getSettings() {
    var s = read(SETTINGS_KEY, {});
    var merged = Object.assign({}, DEFAULT_SETTINGS, s);
    merged.defaults = Object.assign({}, DEFAULT_SETTINGS.defaults, s.defaults || {});
    return merged;
  }

  function saveSettings(settings) {
    write(SETTINGS_KEY, settings);
  }

  function getPositions() {
    return read(POSITIONS_KEY, {});
  }

  function getPosition(symbol) {
    return getPositions()[symbol] || null;
  }

  function savePosition(symbol, pos) {
    var all = getPositions();
    pos.updatedAt = new Date().toISOString();
    all[symbol] = pos;
    write(POSITIONS_KEY, all);
  }

  function deletePosition(symbol) {
    var all = getPositions();
    delete all[symbol];
    write(POSITIONS_KEY, all);
  }

  // 체결 기록 토글: 없으면 추가, 있으면 제거
  function toggleFill(symbol, level, price, qty) {
    var pos = getPosition(symbol);
    if (!pos) return null;
    var idx = pos.fills.findIndex(function (f) { return f.level === level; });
    if (idx >= 0) {
      pos.fills.splice(idx, 1);
    } else {
      pos.fills.push({ level: level, price: price, qty: qty, ts: new Date().toISOString() });
      pos.fills.sort(function (a, b) { return a.level - b.level; });
    }
    savePosition(symbol, pos);
    return pos;
  }

  function updateFill(symbol, level, price, qty) {
    var pos = getPosition(symbol);
    if (!pos) return null;
    var fill = pos.fills.find(function (f) { return f.level === level; });
    if (fill) {
      fill.price = price;
      fill.qty = qty;
      savePosition(symbol, pos);
    }
    return pos;
  }

  // Claude 공유용 내보내기/가져오기 (data/positions.sample.json 포맷)
  function exportJson() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      settings: {
        candleInterval: getSettings().candleInterval,
        feePct: getSettings().feePct,
        symbols: getSettings().symbols
      },
      positions: getPositions()
    }, null, 2);
  }

  function importJson(text) {
    var data = JSON.parse(text);
    if (!data || typeof data.positions !== "object") {
      throw new Error("positions 필드가 없는 JSON입니다.");
    }
    write(POSITIONS_KEY, data.positions);
    return Object.keys(data.positions).length;
  }

  return {
    getSettings: getSettings,
    saveSettings: saveSettings,
    getPositions: getPositions,
    getPosition: getPosition,
    savePosition: savePosition,
    deletePosition: deletePosition,
    toggleFill: toggleFill,
    updateFill: updateFill,
    exportJson: exportJson,
    importJson: importJson,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS
  };
})();

if (typeof module !== "undefined") module.exports = Store;
