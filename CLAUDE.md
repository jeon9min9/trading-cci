# trading CCI

레버리지 ETF(SOXL, BITX, TQQQ, SPXL, QLD) 분할매수 전략 보조 도구. 모바일 웹앱 + Claude Code 브리핑 조합.

## 사용자 매매 전략 (도구가 지원하는 룰)

- CCI(20)가 -50 ~ -100 구간으로 떨어지면 분할매수 시작
- 첫 매수 시작가 기준 1% 하락할 때마다 정해진 금액씩 분할매수
- 가격 회복 시 목표 수익률 도달하면 매도
- **주문 실행은 사용자가 증권사 앱(키움·메리츠)에서 직접 함. 이 도구는 절대 주문을 내지 않는다** — 계산·정보·룰 기반 상태 판정 전용

## 기술 스택

- 순수 HTML, CSS, JavaScript (프레임워크/빌드 도구 없음)
- 시세 데이터: Twelve Data 무료 API (800 credits/일, 8 credits/분, CORS 허용)
  - API 키는 코드/저장소에 절대 넣지 않음 — 설정 화면에서 입력받아 localStorage에만 저장
- CCI(20)는 OHLC를 받아 js/cci.js에서 직접 계산 (호출 수 절약)
- 포지션 데이터는 localStorage 저장, JSON 내보내기/가져오기로 Claude와 공유
- 호스팅: GitHub Pages (정적)
- 로컬 개발: `npx serve` 등 정적 서버만 사용

## 파일 구조

- `index.html` — 대시보드: "오늘 할 일" 요약 + 종목 카드
- `ticker.html?symbol=SOXL` — 종목 상세: 분할매수 사다리 테이블
- `settings.html` — API 키, 파라미터, JSON 내보내기/가져오기
- `css/style.css` — CSS 변수 테마 (다크 기본, 모바일 우선)
- `js/cci.js`, `js/ladder.js`, `js/store.js` — DOM 없는 순수 함수 모듈 (콘솔/node로 검증 가능)
- `js/api.js` — Twelve Data 호출 + 캐시 + 분당 8크레딧 예산 관리
- `js/ui-*.js` — 화면별 렌더링
- `data/positions.sample.json` — 포지션 공유 포맷 정본 (실데이터 `data/positions.json`은 커밋 금지)
- `.claude/skills/` — briefing(아침 브리핑), position-check(수시 상태 판정) 스킬

## 규칙

- 매수/매도 "추천" 문구 금지 — 사용자 정의 룰의 기계적 판정과 공개 정보 정리만 제공
- API 키, 증권사 인증 정보는 어떤 파일에도 커밋하지 않는다
- 요청받은 기능만 구현, 불필요한 추상화 금지
