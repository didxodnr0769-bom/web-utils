# CLAUDE.md

이 프로젝트에서 변경 작업을 시작하기 전에 읽어두세요. 사용자용 안내는 `README.md`.

## 프로젝트 개요

웹 개발에서 자주 쓰는 인코딩/디코딩 + 도구 모음 정적 웹 앱. 한 페이지 안에서 사이드바로 유틸을 전환한다. Vanilla JS(ESM) + Vite 빌드, 가벼운 의존성만 사용. 형제 프로젝트 `07_curl_parser`의 3계층 분리(로직/스토어/UI) 패턴을 그대로 계승.

## 모듈 구조 & 책임

| 파일 | 역할 |
|---|---|
| `index.html` | 진입 HTML. `#app` 한 칸과 모듈 스크립트만. |
| `src/styles.css` | `:root` CSS 변수로 색/여백/모노폰트 정의. `07_curl_parser/styles.css` 톤을 따른다. |
| `src/main.js` | layout 마운트 + router 부팅. |
| `src/store.js` | **유틸별 입력값** + **활성 유틸 ID** 상태. localStorage 키 `web-utils:v1`. `subscribe(fn)` 으로 변경 알림. |
| `src/router.js` | `location.hash` (`#/jwt` 등) 기반 라우팅. view의 mount/unmount 호출. |
| `src/ui/layout.js` | 헤더 + 사이드바 + main 슬롯 구성. |
| `src/ui/sidebar.js` | view 목록을 group(`encoding` / `tools`) 별로 묶어 표시. 활성 항목 하이라이트. |
| `src/ui/widgets.js` | `el / panel / viewHeader / copyButton / segmented / outputBlock / kvTable` — 화면 모듈에서 공통으로 쓰는 작은 빌딩 블록. |
| `src/utils/*.js` | **DOM 의존 없는 순수 로직.** Node `--test` 대상. |
| `src/views/*.js` | 각 유틸 화면 + 이벤트 바인딩. `{ id, label, group, mount(root) }` 인터페이스. `src/views/index.js` 에서 한 배열로 묶어 export. |
| `tests/*.test.mjs` | `node --test` 단위 테스트. |

## 데이터 흐름

```
[사용자 입력]
   │
   ├─ 사이드바 클릭 → location.hash 변경 → router.activate(id) → store.setActive(emit) → sidebar 재동기화 + new view mount
   │
   └─ 폼 input (textarea/select/checkbox 등)
        → 활성 유틸의 inputs[id] 객체 직접 mutate
        → store.persistNow()   (저장만, emit 없음)
        → 같은 view 안에서 render() 부분 호출
```

핵심 객체 — `store.getInputs(id)` 가 돌려주는 유틸별 입력 객체. 예:
```
jwt:            { token }
base64:         { text, mode, urlSafe }
url:            { text, mode }
unix-timestamp: { value, tz }
curl:           { text }
json:           { text, mode, indent }
color:          { text }
```

전체 모양은 `src/store.js` 의 `defaults` 참고. 새 유틸을 추가할 때는 여기에 초기값을 같이 등록해야 한다.

## 핵심 디자인 결정 (변경 전 반드시 읽기)

### 1. 입력 핸들러는 emit 없이 mutate + persistNow

`07_curl_parser/CLAUDE.md` 의 결정 1번과 동일한 이유. store.subscribe → 전체 재렌더가 입력 중에 일어나면 input DOM이 새로 만들어져 **caret 위치를 잃는다**. 그래서:

- 입력 핸들러는 `store.getInputs(id)` 로 받은 객체를 **직접 mutate**하고 `store.persistNow()` (저장만) 호출.
- 그 뒤에는 같은 view 안의 로컬 `render()` 만 호출 — 다른 view에 영향을 주는 변화는 없으므로 전역 emit 필요 없음.
- `store.setActive(id)` 만 emit을 발생시킨다 (사이드바 하이라이트 갱신용).

새 view를 만들 때 이 규칙을 따르세요.

### 2. view 인터페이스는 평평하게 유지

```js
export default {
  id: 'foo',
  label: 'Foo',
  group: 'encoding' | 'tools',
  mount(root) { /* DOM 그리고 핸들러 바인딩 */ },
  unmount() { /* (선택) 구독 해제. router가 mount 전 호출. */ }
};
```

`src/views/index.js` 에 import + 배열 등록하면 사이드바와 라우트가 자동으로 따라온다.

### 3. 순수 로직(`src/utils/`) 과 view(`src/views/`) 분리

- 인코딩/파싱/계산은 DOM에 의존하지 않는 함수로만. `import` 만으로 Node에서 실행 가능 → 단위 테스트 대상.
- view는 input/output 위젯을 만들고 그 함수를 호출.
- 외부 라이브러리를 쓰는 모듈도 utils 안에 둔다. view에 직접 import하지 않기.

### 4. localStorage 스키마

키: `web-utils:v1`. 모양: `{ activeUtil, inputs: { [utilId]: {...} } }`.

`load()` 가 알려진 키만 머지해 들이므로, 새 유틸 추가 시 `defaults` 만 늘리면 기존 사용자도 자연히 신규 필드를 보게 된다. 스키마가 깨지는 변경(필드 의미 변경 등)에서만 `v2` 로 올리고 마이그레이션 또는 무시 정책을 추가하세요.

### 5. Vite + 가벼운 의존성

- 의존성을 추가할 때는 정말 필요한지 한 번 더 생각. 가능한 한 native API (Web Crypto, TextEncoder, URLSearchParams, Intl)로 해결.
- `base: './'` 는 GitHub Pages 서브패스 배포 때문에 유지. 풀어두지 마세요.

## 알려진 한계

- JWT 서명 검증 없음 (디코딩 전용). HS256 등 검증이 필요해지면 Web Crypto + secret 입력 UI 추가.
- cURL 파서는 `-X / -H / -b / -d / --data-raw / --data-binary / --data-urlencode / -F` 등 흔한 옵션만 인식. `-u / -A / -e / --cert / --proxy` 같은 옵션은 무시하고 `unknown[]` 에 기록한다(재직렬화 시 빠짐). PowerShell `^` 라인 연결 미지원. ANSI-C quoting(`$'...'`, `\n \t \xHH \uHHHH` 등)은 지원. multipart(`-F`) 는 raw 영역에 줄바꿈으로 합쳐 보존만 함.
- cURL Body 의 Fields 편집기는 body 가 top-level JSON 객체일 때만 사용 가능. 값의 타입은 휴리스틱 추론(`true/false/null/숫자/{...}/[...]` 리터럴 모양이면 해당 타입, 아니면 문자열)이므로, 문자열 값이 우연히 `"true"`·`"42"` 같은 모양이면 boolean/number 로 직렬화된다. 그런 케이스는 Raw 모드로 편집. Fields 편집기에는 행 옆에 추론된 타입 태그가 표시된다.
- JSON Validator 의 줄/열 위치는 `JSON.parse` 가 던지는 에러 메시지에서 추출하므로 런타임(브라우저/Node) 버전에 따라 누락될 수 있다. 추출 실패 시에는 원본 에러 메시지만 표시.
- Color Converter 는 HEX / RGB(A) / HSL(A) 만 지원. CSS named color(`red`, `cornflowerblue` 등)와 `oklch / lab / color()` 함수는 미지원. Tailwind 매칭은 v3 기본 팔레트(22 hue × 11 shade) 기준 sRGB 유클리드 거리 — 지각적 정확도는 ΔE/Lab 기반이 아님.

## 실행

```bash
npm install
npm run dev                    # 개발 (HMR)
npm test                       # 단위 테스트
node --test tests/             # 같음
npm run build && npm run preview
```

## 추가/수정 시 체크리스트

- [ ] 새 유틸은 `src/utils/<name>.js` (로직) + `src/views/<name>-view.js` (UI) 한 쌍으로
- [ ] `src/views/index.js` 의 배열에 등록
- [ ] `src/store.js` 의 `defaults` 에 초기 입력 상태 추가
- [ ] 입력 핸들러는 결정 1번(mutate + persistNow + 로컬 render) 패턴 따랐는지
- [ ] 순수 로직이라면 `tests/` 에 단위 테스트 (round-trip + 엣지 케이스 1~2개)
- [ ] 새 의존성 추가는 결정 5번 — 진짜 필요한 경우만
- [ ] localStorage 스키마 변경이라면 `STORAGE_KEY` 를 `v2` 로

## 현재 범위 밖 (향후 후보)

- JWT 서명 검증 (HS256/RS256)
- YAML/CSV 포맷터 & JSON 상호 변환
- 해시 생성기 (MD5/SHA, HMAC, UUID)
- Color: ΔE 기반 Lab 거리, CSS named color, oklch/lab 지원
- 다크모드
