# 로지에듀 오답 쌍둥이 클리닉 — 연동 안내

학생이 시험지를 풀고 답을 입력하면 채점하고, 틀린 문항을 다시 풀게 한 뒤, 틀린 문항마다 같은 개념의 변형 문제(쌍둥이) 2개를 풀게 하는 모듈입니다. 스마트 로지에듀 프로그램(logyedu.co.kr)에 붙이기 위한 독립 실행판입니다.

## 1. 파일 구성

```
logyedu-twin-clinic/
  index.html                       화면 전체(HTML·CSS·JS 한 파일, 외부 라이브러리 없음)
  banks/index.json                 세트 목록
  banks/miggang2-final-24.json     문항은행(원 24문항 + 쌍둥이 48문항)
  banks/banks.js                   위 JSON을 그대로 담은 JS(파일을 더블클릭해 열 때도 동작하게)
  README.md                        이 문서
```

- 그대로 열기: `index.html`을 브라우저로 열면 바로 동작합니다. 결과는 그 기기의 브라우저(localStorage)에 임시 저장됩니다.
- 웹 서버에 올리기: 폴더째 올리면 됩니다. `banks/banks.js`가 있으면 그것을 쓰고, 없으면 `banks/index.json`을 fetch로 읽습니다.
- 글꼴은 Google Fonts(IBM Plex Sans KR, Noto Serif KR)를 쓰며, 인터넷이 없으면 기기 기본 글꼴로 보입니다.

## 2. 학생 흐름(화면 순서)

1. 세트 선택 + 이름 입력 → 답 입력(OMR 형태, 모든 문항을 표시해야 채점 버튼이 켜짐)
2. 채점: 맞힌 문항 수, 배점 합(2점/3점), 틀린 문항 번호
3. 틀린 문제 다시 풀기: 지문(접어 둠, 펼쳐 볼 수 있음) + 문항 → 답 고르고 [확인] → 맞음/틀림 표시 → **틀린 이유 6가지 중 하나 선택(필수)** → 해설 표시 → 다음
   - 틀린 이유 보기: 지문 내용을 잘못 이해했어요 / 〈보기〉 조건을 놓쳤어요 / 선지의 한 단어를 놓쳤어요 / 개념을 정확히 몰랐어요 / 두 선지 중에서 헷갈렸어요 / 시간이 부족해 찍었어요 (index.html의 `REASONS` 배열)
4. 쌍둥이 문제: 틀린 문항마다 A·B 두 문제를 차례로 → [확인] → 정답·해설
5. 결과: 처음 맞힌 수, 다시 풀어 고친 수, 쌍둥이 정답 수, 문항별 결과, **선생님께 질문할 문항**(규칙: 쌍둥이 2개 중 하나라도 틀린 원 문항) → 결과 저장 → [다음 학생]

선생님 화면: 주소 끝에 `#teacher` (상단 '선생님' 탭). 세트별로 응시 학생 수, 평균, 문항별 오답률·다시 풀어 고친 비율·쌍둥이 정답률, 학생이 고른 틀린 이유 집계, 학생별 기록을 보여 줍니다.

## 3. 스마트 로지에듀와 연결하는 곳(연동 지점)

`index.html` 머리에 있는 `window.LOGY_TWIN_CONFIG`를 채우면 됩니다. 아무것도 채우지 않으면 기기 저장(localStorage)으로 동작합니다.

```html
<script>
window.LOGY_TWIN_CONFIG = {
  // 로그인한 학생(있으면 이름 칸이 자동으로 채워지고, 결과에 studentId가 들어감)
  student: { id: "S2026-0123", name: "김로지" },

  // 결과 저장: 학생이 클리닉을 끝낼 때 1번 호출. 실패하면 throw.
  saveResult: async (doc) => {
    await fetch("/api/twin-clinic/results", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc)
    }).then(r => { if (!r.ok) throw new Error("save failed") });
  },

  // 선생님 화면 데이터: 결과 배열(최신순)을 돌려주기
  loadResults: async () => (await fetch("/api/twin-clinic/results")).json()
};
</script>
```

우선순위: `CFG.saveResult/loadResults` → (claude.ai에서 열었을 때만) claude.ai 저장소 → localStorage.

권장 서버 테이블(예시): `twin_results(id, student_id, student_name, set_id, set_title, created_at, total, right_cnt, payload_json)` — `payload_json`에 아래 결과 문서를 통째로 저장하면 화면 수정 없이 통계를 다시 계산할 수 있습니다.

## 4. 결과 문서 형식(saveResult로 넘어오는 doc)

```json
{
  "setId": "miggang2-final-24",
  "setTitle": "미강고 2학년 기말 대비 4개 지문 고난도 24제",
  "student": "김로지",
  "studentId": "S2026-0123",
  "createdAt": "2026-11-18T09:12:33.000Z",
  "total": 24,
  "right": 17,
  "answers": [5,4,2,3,1,4, ...],            // 학생이 처음 표시한 답(1~5), 문항 순서대로
  "wrong": [3,8,14,20,21,22,24],            // 처음에 틀린 원 문항 번호
  "retry": [ {"no":3,"pick":2,"correct":true,"reason":"〈보기〉 조건을 놓쳤어요"}, ... ],
  "twins": [ {"vid":"3-A","no":3,"pick":4,"correct":true}, {"vid":"3-B","no":3,"pick":1,"correct":false}, ... ],
  "ask": [3,21]                             // 선생님께 질문할 문항
}
```

## 5. 문항은행 형식(banks/*.json)

```json
{
  "set_id": "miggang2-final-24",
  "title": "미강고 2학년 기말 대비 4개 지문 고난도 24제",
  "version": 1,
  "passages": [
    { "id": "acc", "title": "정보 시스템 접근(접근제어)",
      "lead": "다음 글을 읽고 물음에 답하시오.",
      "text": "문단1\n\n문단2 ..." }              // 문단은 빈 줄로 구분, **굵게**, <u>밑줄</u> 허용
  ],
  "items": [
    {
      "no": 1, "passage": "acc", "points": 2,     // 3이면 [3점] 표시
      "stem": "윗글을 바탕으로 추론한 내용으로 가장 적절한 것은?",
      "box": ["〈보기〉 안의 줄1", "줄2"],          // 〈보기〉가 없으면 []
      "choices": ["선지1", "선지2", "선지3", "선지4", "선지5"],
      "answer": 5,                                // 1~5
      "explain": "정답 근거와 오답 해설",
      "note": ["※ 출제를 위해 추가한 표시 안내 등"],
      "variants": [
        { "vid": "1-A", "passage": "acc", "stem": "...", "box": [], "choices": [...], "answer": 3, "explain": "...", "note": [] },
        { "vid": "1-B", "passage": "acc", "stem": "...", "box": [], "choices": [...], "answer": 4, "explain": "...", "note": [] }
      ]
    }
  ]
}
```

`banks/index.json`은 세트 목록입니다.

```json
[{ "id": "miggang2-final-24", "title": "…", "file": "banks/miggang2-final-24.json", "count": 24, "school": "미강고 2학년", "note": "…" }]
```

## 6. 새 세트 추가하기

1. 새 문항은행 JSON(위 형식, 문항마다 `variants` 2개)을 `banks/` 폴더에 넣습니다. Claude에게 "○○ 세트도 쌍둥이 문항은행 JSON으로 만들어 줘"라고 하면 이 형식으로 받을 수 있습니다.
2. `banks/index.json`에 한 줄을 추가합니다.
3. `banks/banks.js`를 다시 만듭니다(파일을 직접 열어 쓰는 경우에만 필요). 예시:
   ```bash
   python3 -c "import json,glob;idx=json.load(open('banks/index.json'));sets={x['id']:json.load(open(x['file'])) for x in idx};open('banks/banks.js','w').write('window.LOGY_TWIN_BANKS = '+json.dumps({'index':idx,'sets':sets},ensure_ascii=False)+';\n')"
   ```
   서버에서 fetch로 읽게 할 거라면 `banks/banks.js`를 지우고 `index.html`의 `<script src="banks/banks.js">` 줄을 빼면 됩니다.

## 7. 키오스크·태블릿 운영 팁

- 학생 등원 시 키오스크에서 이름을 누르면 `student`를 채워 이 화면을 여는 방식이 가장 간단합니다.
- 인쇄가 필요하면 함께 드린 「오답 쌍둥이 문제집 48제」(docx)를 쓰거나, 서버에서 학생별 `wrong` 번호에 해당하는 `variants`만 골라 문제지를 만들면 됩니다.
- 기준 점수(시험마다 다르게)를 넣고 싶다면 `index.json`의 세트 항목에 `"pass": 18` 같은 값을 추가하고 채점 화면(`renderScore`)에서 비교하도록 확장하면 됩니다.
