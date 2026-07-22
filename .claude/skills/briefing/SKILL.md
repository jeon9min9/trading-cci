---
name: briefing
description: 관심 레버리지 ETF(SOXL, BITX, TQQQ, SPXL, QLD)의 최신 뉴스·전망을 조사해 웹앱의 브리핑 탭(data/briefing.json)을 갱신하고 push. "브리핑 업데이트", "브리핑 갱신", "오늘 브리핑" 요청 시 사용.
---

# 브리핑 업데이트

웹앱 브리핑 탭에 표시되는 `data/briefing.json`을 최신 내용으로 갱신하고 GitHub에 push한다.
(push되면 GitHub Pages를 통해 사용자의 폰에서 바로 보임)

## 절차

1. WebSearch로 각 기초자산의 최신 뉴스·전망 조사 (오늘 날짜 기준 최근 것 위주):
   - SOXL → 반도체 섹터 / SOX 지수 (예: "semiconductor stocks SOX outlook")
   - TQQQ·QLD → 나스닥100 (하나의 항목으로 묶는다)
   - SPXL → S&P500
   - BITX → 비트코인
2. `data/briefing.json`을 아래 스키마로 덮어쓴다. 모든 텍스트는 한국어.

```json
{
  "date": "YYYY-MM-DD",
  "note": "미국장 마감 기준",
  "items": [
    {
      "symbol": "SOXL",
      "mood": "red | yellow | green",
      "title": "반도체 3배",
      "body": "2~4문장. 핵심 수치(지수 등락, 주요 이벤트)와 전망 관측을 담백하게. 레버리지 특성 리스크 언급."
    }
  ],
  "sources": [{ "title": "매체명", "url": "https://..." }]
}
```

   - mood 기준: red = 급락/높은 리스크 국면, yellow = 중립/혼조, green = 반등/양호
   - items 순서는 SOXL, TQQQ · QLD, SPXL, BITX 고정
3. 커밋 후 push:
   - 커밋 메시지: `브리핑 업데이트 YYYY-MM-DD`
   - `git add data/briefing.json && git commit && git push origin main`

## 제약 (반드시 지킬 것)

- 매수/매도 추천·권유 문구 금지. 공개 정보 요약과 관측 전달만 한다 ("~라는 관측이 나옴" 수준).
- 전망은 반드시 출처와 함께. sources에 실제 사용한 기사 URL만 넣는다.
- briefing.json 외 다른 파일은 수정하지 않는다.
