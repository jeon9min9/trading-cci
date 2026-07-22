# trading CCI

레버리지 ETF(SOXL, BITX, TQQQ, SPXL, QLD) 단타 분할매수용 계산기. 모바일 웹앱.

## 목적

CCI가 -50 ~ -100 구간에 들어왔을 때 분할매수를 시작하는 전략을 보조한다.
시작가에서 1%씩 떨어질 때마다 정해진 금액씩 분할매수하는 표를 계산해서 보여준다.

## 기술 스택

- 순수 HTML, CSS, JavaScript (프레임워크/빌드 도구 없음)
- 입력값은 localStorage에 저장 (재방문 시 복원)
- 호스팅: GitHub Pages (정적)
- 로컬 개발: `npx serve` 등 정적 서버

## 파일 구조

- `index.html` — 탭 2개: 계산기(입력 3개 + 표) / 브리핑
- `css/style.css` — 다크 기본 테마, 모바일 우선
- `js/calc.js` — 분할매수 표 계산/렌더
- `js/briefing.js` — 탭 전환 + `data/briefing.json` 렌더
- `js/theme.js` — 다크/라이트 토글
- `data/briefing.json` — 브리핑 내용. Claude가 briefing 스킬로 생성·갱신 후 push
- `.claude/skills/briefing/` — 브리핑 갱신 스킬

## 브리핑 흐름

웹앱은 API를 호출하지 않는다. Claude Code가 뉴스를 조사해 `data/briefing.json`을 갱신하고
push하면 GitHub Pages가 폰에 보여준다. 갱신 요청: "브리핑 업데이트해줘".

## 원칙

- 단순하게 유지. 요청받지 않은 옵션(API 연동, CCI 자동표시, 목표수익률 등)을 추가하지 않는다.
- 투자 상태 조언은 웹앱이 아니라 Claude Code 대화로 처리한다.
- 매수/매도 추천 금지 — 계산 결과와 공개 정보 요약만 제공한다.
