# Web Utils

웹 개발 중 자주 쓰는 인코딩/디코딩 + 작은 도구 모음. 한 페이지에서 사이드바로 전환해 쓰는 정적 웹 앱.

## 포함된 유틸

**Encoding / Decoding**
- JWT Decoder — header/payload/signature 분해, claim 시각 표시 (서명 검증은 미지원, 타임스탬프 KST 툴팁 제공)
- Base64 ↔ Text (UTF-8 안전, URL-safe 옵션)
- URL encode/decode (`encodeURIComponent` 기준)

**Tools**
- cURL Parser — curl 명령을 메서드/URL/쿼리/헤더/바디로 분해, 각 항목 인라인 편집, Cookie는 세미콜론 단위로 분해, 변경 시 정규화된 curl로 즉시 재직렬화 (ANSI-C `$'...'` quoting 지원)
- Unix Timestamp ↔ Date (sec/ms 자동 감지, ISO/로컬/상대시간)

입력값은 자동으로 localStorage에 저장됩니다. 새로고침해도 마지막 입력과 활성 유틸이 복원됩니다.

## 개발

```bash
npm install
npm run dev      # Vite dev 서버
npm test         # 순수 로직 단위 테스트 (node --test)
npm run build    # dist/ 정적 빌드
npm run preview  # 빌드 결과 미리보기
```

## 배포

GitHub Pages 등 정적 호스팅에 `dist/`를 그대로 올리면 됩니다. `vite.config.js`에 `base: './'`이 설정되어 있어 서브패스 배포도 동작합니다.

## 새 유틸 추가

1. `src/utils/<name>.js` — DOM 의존 없는 순수 로직 + 함수 export
2. `src/views/<name>-view.js` — `{ id, label, group, mount(root) }` 모양의 모듈
3. `src/views/index.js` 의 `views` 배열에 등록
4. `src/store.js` 의 `defaults` 에 초기 입력 상태 추가
5. (선택) `tests/*.test.mjs` 에 단위 테스트 추가

`group: 'encoding' | 'tools'` — 사이드바 분류용.
