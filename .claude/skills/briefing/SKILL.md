---
name: briefing
description: 사용자가 현재 투자 중인 종목(data/positions.json)만 골라 최신 뉴스와 룰 기반 포지션 상태를 정리해 웹앱 브리핑 탭(data/briefing.json)을 갱신하고 push. "브리핑 업데이트", "브리핑 갱신", "오늘 브리핑", 투자 상황 공유 후 브리핑 요청 시 사용.
---

# 브리핑 업데이트 (보유 종목 기준)

`data/positions.json`(로컬 전용, gitignore됨)에 저장된 보유 종목만 대상으로
`data/briefing.json`을 갱신하고 GitHub에 push한다. push되면 GitHub Pages를 통해 폰에서 보임.

## 포지션 파일 (data/positions.json — 절대 커밋하지 않는다)

사용자가 대화로 투자 상황을 공유하면 이 파일을 갱신한다:

```json
{
  "updatedAt": "YYYY-MM-DD",
  "positions": [
    { "symbol": "SOXL", "avg": 23.5, "qty": 40, "startPrice": 24.0, "note": "L3까지 체결" }
  ]
}
```

avg(평단)는 필수, qty/startPrice/note는 사용자가 준 만큼만. 파일이 없으면 사용자에게
현재 투자 상황(종목, 평단, 필요 시 수량·시작가)을 물어본다.

## 절차

1. `data/positions.json` 읽기 → 보유 종목 목록 확정. **보유 종목만 브리핑한다.**
2. WebSearch로 각 보유 종목의 기초자산 최신 뉴스·전망 + 현재가(전일 종가) 조사:
   - SOXL → 반도체/SOX, TQQQ·QLD → 나스닥100, SPXL → S&P500, BITX → 비트코인
3. 종목별 룰 기반 상태 판정 (사용자 전략):
   - 현재가 vs 평단: 등락률 계산
   - 다음 1% 매수 레벨: startPrice가 있으면 startPrice × (1 − n/100) 중 현재가 바로 아래 레벨
   - 가격이 평단 위로 회복 → "회복 구간" 표시
4. `data/briefing.json` 덮어쓰기 (모든 텍스트 한국어):

```json
{
  "date": "YYYY-MM-DD",
  "note": "미국장 마감 기준 · 보유 종목",
  "items": [
    {
      "symbol": "SOXL",
      "mood": "red | yellow | green",
      "title": "반도체 3배",
      "position": "평단 $23.50 대비 -3.2% · 다음 매수 레벨 $22.56 (-0.8% 남음)",
      "body": "뉴스·전망 요약 2~4문장 + 이 포지션 관점에서 참고할 점."
    }
  ],
  "sources": [{ "title": "매체명", "url": "https://..." }]
}
```

   - `position` 줄에는 수량·금액을 넣지 않는다 (공개 저장소 — 평단/레벨 가격까지만)
5. 커밋 후 push: `git add data/briefing.json && git commit -m "브리핑 업데이트 YYYY-MM-DD" && git push origin main`
   - **data/positions.json이 스테이징되지 않았는지 반드시 확인**

## 제약 (반드시 지킬 것)

- 매수/매도 추천·권유 문구 금지. 룰 기반 판정("다음 매수 레벨 -0.8% 남음")과 공개 정보 요약만.
- Claude는 공인 투자자문가가 아님 — body에서 전망은 출처와 함께 관측으로만 전달.
- 보유 수량·투자 금액을 briefing.json에 쓰지 않는다.
- briefing.json 외 다른 파일은 커밋하지 않는다.
