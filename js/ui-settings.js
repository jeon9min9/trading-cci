// 설정 화면: API 키, 데이터 옵션, 사다리 기본값, 내보내기/가져오기

(function () {
  var notice = document.getElementById("notice");

  function $(id) { return document.getElementById(id); }

  function show(msg, isError) {
    notice.innerHTML = '<div class="notice' + (isError ? " error" : "") + '">' + msg + "</div>";
  }

  function render() {
    var s = Store.getSettings();
    $("api-key").value = s.apiKey;
    $("candle-interval").value = s.candleInterval;
    $("fee-pct").value = s.feePct;
    $("symbols").value = s.symbols.join(", ");
    $("d-stepPct").value = s.defaults.stepPct;
    $("d-levels").value = s.defaults.levels;
    $("d-targetPct").value = s.defaults.targetPct;
    $("d-amountPerLevel").value = s.defaults.amountPerLevel;
    $("d-multiplier").value = s.defaults.multiplier;
  }

  $("toggle-key").addEventListener("click", function () {
    var input = $("api-key");
    var showing = input.type === "text";
    input.type = showing ? "password" : "text";
    this.textContent = showing ? "표시" : "숨김";
  });

  $("save").addEventListener("click", function () {
    var s = Store.getSettings();
    s.apiKey = $("api-key").value.trim();
    s.candleInterval = $("candle-interval").value;
    s.feePct = parseFloat($("fee-pct").value) || 0;
    s.symbols = $("symbols").value.split(",").map(function (v) {
      return v.trim().toUpperCase();
    }).filter(Boolean);
    s.defaults.stepPct = parseFloat($("d-stepPct").value) || 1;
    s.defaults.levels = Math.max(1, Math.round(parseFloat($("d-levels").value) || 10));
    s.defaults.targetPct = parseFloat($("d-targetPct").value) || 3;
    s.defaults.amountPerLevel = parseFloat($("d-amountPerLevel").value) || 100;
    s.defaults.multiplier = parseFloat($("d-multiplier").value) || 1;
    Store.saveSettings(s);
    show("저장했습니다.");
  });

  $("export-btn").addEventListener("click", function () {
    var json = Store.exportJson();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(function () {
        show("클립보드에 복사했습니다. Claude Code에 붙여넣으세요.");
      }, function () {
        fallbackExport(json);
      });
    } else {
      fallbackExport(json);
    }
  });

  function fallbackExport(json) {
    $("import-box").value = json;
    show("클립보드 접근이 안 되어 아래 텍스트 상자에 출력했습니다. 직접 복사하세요.");
  }

  $("import-btn").addEventListener("click", function () {
    var text = $("import-box").value.trim();
    if (!text) {
      show("가져올 JSON을 붙여넣어주세요.", true);
      return;
    }
    if (!confirm("기존 포지션 데이터를 전부 덮어씁니다. 계속할까요?")) return;
    try {
      var count = Store.importJson(text);
      show(count + "개 종목의 포지션을 가져왔습니다.");
      $("import-box").value = "";
    } catch (e) {
      show("가져오기 실패: " + e.message, true);
    }
  });

  render();
})();
