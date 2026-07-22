// Twelve Data 호출 + 캐시 + 크레딧 예산 관리
// 무료 플랜: 8 credits/분, 800/일. 폴링 없음 — 화면이 보일 때 + 캐시가 스테일할 때만 호출.

var API = (function () {
  var BASE = "https://api.twelvedata.com";
  var CREDIT_LIMIT = 8;
  var WINDOW_MS = 60000;
  var CACHE_KEY = "sl_cache";
  var CALLS_KEY = "sl_calls";

  var TTL = {
    quote: 60 * 1000,        // 상세 화면 단건 시세
    series: 180 * 1000       // 대시보드용 OHLC (장중)
  };

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  // --- 미국 동부 기준 정규장 여부 (공휴일 미반영) ---
  function marketOpen() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short", hour: "numeric", minute: "numeric", hour12: false
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    if (map.weekday === "Sat" || map.weekday === "Sun") return false;
    var mins = parseInt(map.hour, 10) % 24 * 60 + parseInt(map.minute, 10);
    return mins >= 9 * 60 + 30 && mins < 16 * 60;
  }

  // --- 분당 크레딧 슬라이딩 윈도우 ---
  function creditsUsed() {
    var now = Date.now();
    var calls = readJson(CALLS_KEY, []).filter(function (c) {
      return now - c.ts < WINDOW_MS;
    });
    localStorage.setItem(CALLS_KEY, JSON.stringify(calls));
    return calls.reduce(function (a, c) { return a + c.credits; }, 0);
  }

  function recordCall(credits) {
    var calls = readJson(CALLS_KEY, []);
    calls.push({ ts: Date.now(), credits: credits });
    localStorage.setItem(CALLS_KEY, JSON.stringify(calls));
  }

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  async function throttle(credits) {
    while (creditsUsed() + credits > CREDIT_LIMIT) {
      await sleep(2000);
    }
  }

  // --- 캐시 ---
  function cacheGet(key, ttl) {
    var cache = readJson(CACHE_KEY, {});
    var entry = cache[key];
    if (!entry) return null;
    // 장 마감 중에는 캐시를 무기한 사용 (호출 차단)
    var effectiveTtl = marketOpen() ? ttl : Infinity;
    if (Date.now() - entry.ts > effectiveTtl) return null;
    return entry.data;
  }

  function cacheSet(key, data) {
    var cache = readJson(CACHE_KEY, {});
    cache[key] = { ts: Date.now(), data: data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }

  function cacheAge(key) {
    var cache = readJson(CACHE_KEY, {});
    return cache[key] ? Date.now() - cache[key].ts : null;
  }

  async function fetchJson(path, params, credits) {
    var settings = Store.getSettings();
    if (!settings.apiKey) throw new Error("NO_API_KEY");
    await throttle(credits);
    recordCall(credits);
    var qs = new URLSearchParams(Object.assign({}, params, { apikey: settings.apiKey }));
    var res = await fetch(BASE + path + "?" + qs.toString());
    var data = await res.json();
    if (data.status === "error" || data.code >= 400) {
      throw new Error(data.message || "API 오류");
    }
    return data;
  }

  // 단건 시세 (1 credit)
  async function getQuote(symbol, force) {
    var key = "quote:" + symbol;
    if (!force) {
      var cached = cacheGet(key, TTL.quote);
      if (cached) return cached;
    }
    var data = await fetchJson("/quote", { symbol: symbol }, 1);
    var quote = {
      symbol: symbol,
      price: parseFloat(data.close),
      change: parseFloat(data.change),
      changePct: parseFloat(data.percent_change),
      prevClose: parseFloat(data.previous_close),
      ts: Date.now()
    };
    cacheSet(key, quote);
    return quote;
  }

  // OHLC 시계열 (1 credit) — CCI 계산 + 대시보드 가격 표시 겸용
  async function getSeries(symbol, interval, force) {
    var key = "series:" + symbol + ":" + interval;
    if (!force) {
      var cached = cacheGet(key, TTL.series);
      if (cached) return cached;
    }
    var data = await fetchJson("/time_series", {
      symbol: symbol,
      interval: interval,
      outputsize: 60
    }, 1);
    if (!data.values || !data.values.length) throw new Error(symbol + ": 데이터 없음");
    // Twelve Data는 최신 → 과거 순으로 주므로 뒤집는다
    var candles = data.values.map(function (v) {
      return {
        datetime: v.datetime,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close)
      };
    }).reverse();
    var result = { symbol: symbol, interval: interval, candles: candles, ts: Date.now() };
    cacheSet(key, result);
    return result;
  }

  // 대시보드용 종목 요약: series 1콜로 가격/등락률/CCI 모두 계산
  async function getSummary(symbol, interval, force) {
    var series = await getSeries(symbol, interval, force);
    var candles = series.candles;
    var last = candles[candles.length - 1];
    var prev = candles[candles.length - 2];
    return {
      symbol: symbol,
      price: last.close,
      prevClose: prev ? prev.close : null,
      changePct: prev ? ((last.close - prev.close) / prev.close) * 100 : null,
      cci: CCI.latest(candles, 20),
      candleTime: last.datetime,
      fetchedAt: series.ts
    };
  }

  return {
    marketOpen: marketOpen,
    creditsUsed: creditsUsed,
    cacheAge: cacheAge,
    getQuote: getQuote,
    getSeries: getSeries,
    getSummary: getSummary
  };
})();
