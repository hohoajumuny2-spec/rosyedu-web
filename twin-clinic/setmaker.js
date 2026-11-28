/* 오답 쌍둥이 클리닉 — 원장님이 만든 세트(원래 문제 + 유사 문제)를 읽고, 학생별 유사 문제지를 출력한다.
 *
 * 세트 양식(워드 .docx 또는 글 .txt) — 한 줄에 한 가지씩:
 *   (첫 줄)  세트 제목
 *   [1~3] 다음 글을 읽고 물음에 답하시오.      ← 지문 시작. 다음 문항 전까지가 지문
 *   (지문 문단들)
 *   1. 문제 [3점]
 *   〈보기〉 …                                  ← 있으면
 *   ① …  ② …  ③ …  ④ …  ⑤ …
 *   정답: ④
 *   해설: …
 *   1-A. 유사 문제 (원래 1번과 같은 지문)
 *   ① … ⑤ …
 *   정답: ②
 *   해설: …
 *   1-B. 유사 문제 …
 * 정답은 맨 뒤 '정답 모아보기' 줄 아래에 '1번 ④ / 1-A ② / 1-B ③'처럼 모아 적어도 된다.
 *
 * 2026-11-28: 유사 문제 번호를 1, 2, 3…으로 그냥 붙여도 된다 — 어느 원래 문제의 쌍둥이인지만 알려 주면 된다.
 *   ① 머리줄:  '1번 유사 문제' · '[1번 쌍둥이]' · '원래 1번' · '원 1번의 쌍둥이' 처럼 한 줄 적고 그 아래에 1. 2. …
 *              (다음 머리줄이 나올 때까지 그 아래 문제는 모두 그 원래 문제의 쌍둥이)
 *   ② 꼬리표:  '3. (1번 유사) 다음 중 …' 처럼 문제 앞에 (원래 번호) 를 붙이기
 *   맨 뒤 '정답 모아보기'의 번호는 그 파일에 적힌 번호(1, 2, 3…) 그대로 적으면 된다(유사 문제만 있는 파일).
 *   ③ 차례대로: 머리줄 · 꼬리표 없이 1~56번만 적은 파일 + 원래 문제 수(28) → 1·2번은 원 1번, 3·4번은 원 2번 …
 *              parse(text, {originals: 28}). 원래 문제 수를 모르면 결과의 plain(문제 수)을 보고 화면이 물어본다.
 */
window.TwinSet = (function () {
  const C = "①②③④⑤";
  const RANGE = /^\s*\[\s*(\d+)\s*[~∼～-]\s*(\d+)\s*\]\s*(.*)$/;
  const VAR = /^\s*(\d{1,3})\s*-\s*([A-Da-d])\s*[.)．]\s*(.*)$/;
  const Q = /^\s*(\d{1,3})\s*[.)．]\s*(.+)$/;
  const BOX = /^\s*[〈<＜]\s*보\s*기\s*[〉>＞]\s*/;
  const PASSAGE = /^\s*지문\s*[:：]\s*(.+)$/;                   // '지문: 정보 시스템 접근' 양식
  const ORIG = /^\s*원\s*(\d{1,3})\s*번\s*의?\s*(쌍둥이|유사)/;     // '원 3번의 쌍둥이' — 원래 문제 없이 유사 문제만
  // 머리줄: '1번 유사 문제' · '[1번 쌍둥이]' · '<1번 변형 문항>' · '(원래 1번)' · '원래 문제 1번' — 그 아래 1. 2. …는 이 번호의 쌍둥이
  const HEAD = /^\s*[\[【<〈(（]?\s*(?:원래?\s*(?:문제\s*|문항\s*)?)?(\d{1,3})\s*번\s*(?:문제|문항)?\s*(?:의|에\s*대한)?\s*(?:(?:쌍둥이|유사|변형)\s*(?:문제|문항)?\s*(?:\d+\s*개)?)?\s*[\]】>〉)）]?\s*[:：]?\s*$/;
  const HEAD_NEEDS = /쌍둥이|유사|변형|원래?/;
  // 꼬리표: '3. (1번 유사) 다음 중…' · '3. [원 1번] …'
  const TAG = /^[\[【(（<〈]\s*(?:원래?\s*)?(\d{1,3})\s*번\s*(?:의)?\s*(?:쌍둥이|유사|변형)?\s*(?:문제|문항)?\s*[\]】)）>〉]\s*/;
  const EXP_TAIL = /^\s*(\d{1,3}(?:\s*-\s*[A-Da-d])?)\s*[.)．]\s*(?:\[?정답\]?\s*[:：]?\s*)?([①②③④⑤]|[1-5](?![\d.]))?\s*(.*)$/;

  function ansOf(s) {
    s = String(s || "").trim();
    const i = C.indexOf(s[0]);
    if (i >= 0) return i + 1;
    const n = parseInt(s, 10);
    return n >= 1 && n <= 5 ? n : 0;
  }

  // ① 가 ② 나 … 가 한 줄에 여럿 있어도 나눈다
  function choicesIn(line) {
    const at = [];
    for (let i = 0; i < line.length; i++) { const k = C.indexOf(line[i]); if (k >= 0) at.push([i, k]); }
    return at.map(([i, k], j) => ({ k, t: line.slice(i + 1, j + 1 < at.length ? at[j + 1][0] : line.length).trim() }));
  }

  // 원래 문제는 종이로만 나눠 주고 여기에는 유사 문제만 적은 경우의 빈 자리
  function baseOnly(no, passage) { const q = newQ("", passage); q.no = no; q.variants = []; q.twinOnly = true; q.choices = []; return q; }

  function newQ(stem, passage) {
    const three = /\[\s*3\s*점\s*\]/.test(stem);
    return { stem: stem.replace(/\s*\[\s*3\s*점\s*\]\s*/, " ").trim(), box: [], choices: ["", "", "", "", ""], answer: 0,
             explain: "", note: [], passage: passage || "", points: three ? 3 : 2, _inBox: false, _seenChoice: false, _last: -1 };
  }

  function parse(text, opts) {
    opts = opts || {};
    const lines = String(text || "").replace(/\r/g, "").split("\n");
    const passages = [], items = [], key = {}, warn = [], tailEx = {};
    let title = "", pass = null, cur = null, mode = "", tail = "", twinFor = 0;
    const alias = {};   // 파일에 적힌 번호(1, 2, 3…) → 쌍둥이 vid('1-A') — 정답 모아보기 채우기용
    function addVariant(baseNo, stem, plainNo) {
      let base = items.find(x => x.no === baseNo);
      if (!base) { base = baseOnly(baseNo, pass ? pass.id : ""); items.push(base); }
      const q = newQ(stem, pass ? pass.id : base.passage);
      q.vid = baseNo + "-" + "ABCDEFGH"[Math.min(base.variants.length, 7)];
      if (base.variants.length >= 4) warn.push(baseNo + "번 쌍둥이가 4개를 넘습니다. 앞의 4개만 씁니다.");
      if (plainNo) { q.plainNo = plainNo; alias[String(plainNo)] = q.vid; }
      base.variants.push(q);
      return q;
    }

    // 제목: 첫 줄이 지문 · 문항 · 쌍둥이 머리줄이 아니면
    const isHead = l => HEAD.test(l) && HEAD_NEEDS.test(l);
    const fi = lines.findIndex(l => l.trim());
    if (fi >= 0 && !RANGE.test(lines[fi]) && !Q.test(lines[fi]) && !isHead(lines[fi]) && !ORIG.test(lines[fi]) && lines[fi].trim().length <= 80) { title = lines[fi].trim(); lines.splice(fi, 1); }

    for (const raw of lines) {
      const l = raw.trim();
      if (!l) { if (mode === "passage" && pass) pass.paras.push(""); continue; }
      if (/^[\[【]?\s*정답\s*(모아\s*보기|표|한눈에)\s*[\]】]?$/.test(l)) { tail = "key"; cur = null; mode = ""; continue; }
      if (tail && /^[\[【]?\s*(상세\s*|자세한\s*)?(정답\s*(과|및)\s*)?해설\s*[\]】]?$/.test(l)) { tail = "ex"; continue; }
      if (tail === "key") {
        for (const m of l.matchAll(/(\d{1,3}(?:\s*-\s*[A-Da-d])?)\s*번?\s*[.:)]?\s*([①②③④⑤]|[1-5](?![\d.]))/g))
          key[m[1].replace(/\s/g, "").toUpperCase()] = ansOf(m[2]);
        continue;
      }
      if (tail === "ex") {   // '1-A. 정답 ③ 해설…' — 번호마다 정답 · 해설
        const m = l.match(EXP_TAIL);
        if (m && /\d/.test(m[1])) { const k = m[1].replace(/\s/g, "").toUpperCase(); tailEx[k] = { a: m[2] ? ansOf(m[2]) : 0, t: m[3] || "" }; tailEx._last = k; }
        else if (tailEx._last) tailEx[tailEx._last].t += "\n" + l;
        continue;
      }
      if (!items.length && !pass && /^[○●◦※▶·•]/.test(l)) continue;   // 맨 앞 메모

      let m;
      if ((m = l.match(PASSAGE))) {
        pass = { id: "p" + (passages.length + 1), range: "", title: m[1].trim(), lead: "", paras: [] };
        passages.push(pass); mode = "passage"; cur = null; continue;
      }
      if (mode === "passage" && pass && !pass.lead && !pass.paras.some(Boolean) && /^(다음|윗글|아래)/.test(l) && /읽고|물음/.test(l)) { pass.lead = l; continue; }
      if ((m = l.match(ORIG)) || (isHead(l) && (m = l.match(HEAD)))) {
        if (!items.some(x => x.no === +m[1])) items.push(baseOnly(+m[1], pass ? pass.id : ""));
        twinFor = +m[1];      // 이 아래 1. 2. …는 이 번호의 쌍둥이
        mode = ""; cur = null; continue;
      }
      if ((m = l.match(RANGE))) {
        const range = m[1] + "~" + m[2], isLead = /다음|읽고|물음/.test(m[3]);
        if (pass && pass.range === range && !pass.paras.some(Boolean)) {   // '[1~14] 주제' 다음 '[1~14] 다음 글을…'
          if (isLead) pass.lead = l; else pass.title = m[3];
        } else {
          pass = { id: "p" + (passages.length + 1), range, title: isLead ? "" : m[3], lead: isLead ? l : "", paras: [] };
          passages.push(pass);
        }
        mode = "passage"; cur = null; continue;
      }
      if ((m = l.match(VAR))) {
        let base = items.find(x => x.no === +m[1]);
        if (!base) { base = baseOnly(+m[1], pass ? pass.id : ""); items.push(base); }
        if (base) {
          cur = newQ(m[3], base.passage);
          cur.vid = m[1] + "-" + m[2].toUpperCase();
          base.variants.push(cur); mode = "q"; continue;
        }
      }
      if ((m = l.match(Q)) && (twinFor || TAG.test(m[2])) && (mode !== "passage" || /[?？]|것은|고른|쓰시오|하시오|\[3점\]|^[\[【(（<〈]/.test(m[2]))) {
        const t = m[2].match(TAG);
        cur = addVariant(t ? +t[1] : twinFor, t ? m[2].replace(TAG, "") : m[2], +m[1]);
        mode = "q"; continue;
      }
      if ((m = l.match(Q))) {
        const no = +m[1];
        if (!items.some(x => x.no === no) && (mode !== "passage" || /[?？]|것은|고른|쓰시오|하시오|\[3점\]/.test(m[2]))) {
          cur = newQ(m[2], pass ? pass.id : ""); cur.no = no; cur.variants = [];
          items.push(cur); mode = "q"; continue;
        }
      }
      if (mode === "passage" && pass) { pass.paras.push(l); continue; }
      if (!cur) continue;

      let g;
      if ((g = l.match(/^[\[【]?\s*(?:정답|답)\s*[\]】]?\s*[:：]?\s*([①②③④⑤]|[1-5])(?![\d.])/))) { cur.answer = ansOf(g[1]); mode = "q"; continue; }
      if ((g = l.match(/^[\[【]?\s*해설\s*[\]】]?\s*[:：]?\s*(.*)$/))) { cur.explain = g[1]; mode = "ex"; continue; }
      if (mode === "ex") { cur.explain += "\n" + l; continue; }
      if (BOX.test(l)) { cur._inBox = true; const t = l.replace(BOX, ""); if (t) cur.box.push(t); continue; }
      const cs = /^[①②③④⑤]/.test(l) ? choicesIn(l) : [];
      if (cs.length) { cs.forEach(c => { cur.choices[c.k] = c.t; cur._last = c.k; }); cur._seenChoice = true; cur._inBox = false; continue; }
      if (cur._seenChoice && cur._last >= 0) { cur.choices[cur._last] += " " + l; continue; }   // 선택지가 다음 줄로 이어짐
      if (cur._inBox) cur.box.push(l); else cur.stem += "\n" + l;
    }

    // 맨 뒤 정답 모아보기 · 정답과 해설로 빈 정답 · 해설 채우기
    const fill = (q, k) => {
      if (!q.answer && key[k]) q.answer = key[k];
      const e = tailEx[k];
      if (e) { if (!q.answer && e.a) q.answer = e.a; if (!q.explain && e.t) q.explain = e.t.trim(); }
    };
    // ③ 차례대로 묶기: 원래 문제 없이 1~N번만 적은 파일(머리줄 · 꼬리표 · 1-A 없음)
    const plain = items.length > 0 && items.every(it => !it.twinOnly && !it.variants.length) ? items.length : 0;
    let grouped = 0;
    const M = parseInt(opts.originals, 10);
    if (plain && M > 0) {
      if (plain % M) warn.push(`유사 문제 ${plain}개를 원래 문제 ${M}개로 똑같이 나눌 수 없습니다. (원래 문제마다 같은 수만큼 적어 주세요)`);
      else {
        const k = plain / M;
        if (k > 4) warn.push(`원래 문제마다 쌍둥이가 ${k}개입니다. 앞의 4개만 씁니다.`);
        const qs = items.slice().sort((a, b) => a.no - b.no);
        items.length = 0;
        for (let g = 0; g < M; g++) {
          const base = baseOnly(g + 1, qs[g * k].passage);
          qs.slice(g * k, g * k + k).forEach((q, j) => {
            q.plainNo = q.no; delete q.no; delete q.variants;
            q.vid = (g + 1) + "-" + "ABCDEFGH"[Math.min(j, 7)];
            base.variants.push(q);
          });
          items.push(base);
        }
        grouped = k;
      }
    }
    // 1, 2, 3…으로 적은 쌍둥이는 정답 모아보기도 그 번호로 적었을 수 있다(원래 문제가 같이 없는 파일일 때만 — 번호가 겹치지 않게)
    const plainNos = items.flatMap(it => it.variants.map(v => v.plainNo).filter(Boolean));
    const onlyTwins = items.every(it => it.twinOnly) && new Set(plainNos).size === plainNos.length;   // 번호가 겹치면(머리줄마다 1부터) 번호로는 안 채운다
    for (const it of items) {
      if (!it.twinOnly) fill(it, String(it.no));
      for (const v of it.variants) { fill(v, v.vid); if (onlyTwins && v.plainNo) fill(v, String(v.plainNo)); }
    }
    const clean = q => { const o = { ...q }; delete o._inBox; delete o._seenChoice; delete o._last; delete o.plainNo; o.explain = o.explain.trim(); return o; };
    const outItems = items.map(it => ({ ...clean(it), variants: it.variants.map(clean) })).sort((a, b) => a.no - b.no);
    const outPass = passages.map((p, i) => {
      const paras = []; let buf = [];
      for (const x of p.paras) { if (x) buf.push(x); else if (buf.length) { paras.push(buf.join("\n")); buf = []; } }
      if (buf.length) paras.push(buf.join("\n"));
      const text = p.paras.filter(Boolean).join("\n\n");
      return { id: p.id, title: p.title || text.replace(/^\(.\)\s*/, "").slice(0, 24) + (text.length > 24 ? "…" : "") || ("지문 " + (i + 1)),
               lead: p.lead || "다음 글을 읽고 물음에 답하시오.", text };
    });

    // 점검
    for (const it of outItems) {
      const name = it.no + "번";
      if (!it.twinOnly && it.choices.some(c => !c)) warn.push(name + ": 선택지 ①~⑤가 다 있지 않습니다.");
      if (!it.twinOnly && !it.answer) warn.push(name + ": 정답이 없습니다.");
      if (!it.variants.length) warn.push(name + ": 유사 문제가 없습니다. (" + it.no + "-A. 처럼 붙이거나, '" + it.no + "번 유사 문제' 줄 아래에 적어 주세요)");
      for (const v of it.variants) {
        if (v.choices.some(c => !c)) warn.push(v.vid + ": 선택지 ①~⑤가 다 있지 않습니다.");
        if (!v.answer) warn.push(v.vid + ": 정답이 없습니다.");
      }
    }
    const twinOnly = outItems.length > 0 && outItems.every(i => i.twinOnly);
    // plain: 차례대로 묶을 수 있는 파일이면 그 문제 수(아직 안 묶었을 때만) · grouped: 원래 문제마다 몇 개씩 묶었나
    return { bank: { title, passages: outPass, items: outItems, twinOnly }, warn, plain: grouped ? 0 : plain, grouped };
  }

  // 화면 도우미: 파일 글 → 세트. 1~N번만 적은 유사 문제 파일이면 원래 문제 수로 차례대로 묶는다.
  //   known: 화면이 아는 원래 문제 수(과제 정답표 문항 수 등). 모르거나 나누어떨어지지 않으면 물어본다.
  function parseAuto(text, known) {
    let r = parse(text);
    if (!r.plain) return r;
    let M = parseInt(known, 10);
    if (!(M > 0 && r.plain % M === 0 && r.plain >= M)) {
      const guess = r.plain % 2 === 0 ? r.plain / 2 : r.plain;
      const a = typeof prompt === "function" ? prompt(`이 파일에서 1~${r.plain}번 문제를 찾았습니다.\n원래 문제는 몇 문제인가요? (예: 28 → 1·2번은 원 1번, 3·4번은 원 2번 …)\n\n원래 문제와 유사 문제가 같은 파일에 있으면 [취소]를 누르세요.`, String(M > 0 ? M : guess)) : null;
      M = parseInt(a, 10);
      if (!(M > 0)) return r;
    }
    return parse(text, { originals: M });
  }

  // ── 워드(.docx) 읽기: 브라우저만으로 (라이브러리 없이) ──
  async function zipEntry(buf, name) {
    const dv = new DataView(buf), dec = new TextDecoder();
    let e = buf.byteLength - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) return null;
    let p = dv.getUint32(e + 16, true);
    const cnt = dv.getUint16(e + 10, true);
    for (let i = 0; i < cnt; i++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      if (dec.decode(new Uint8Array(buf, p + 46, nlen)) === name) {
        const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
        const data = new Uint8Array(buf, start, csize);
        if (method === 0) return dec.decode(data);
        const out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
        return dec.decode(out);
      }
      p += 46 + nlen + xlen + clen;
    }
    return null;
  }
  function docxToText(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const runText = r => {
      let t = "";
      for (const c of r.childNodes) {
        if (c.namespaceURI !== W) continue;
        if (c.localName === "t") t += c.textContent;
        else if (c.localName === "tab") t += "\t";
        else if (c.localName === "br" || c.localName === "cr") t += "\n";
      }
      const u = r.getElementsByTagNameNS(W, "u")[0];
      const ul = u && (u.getAttributeNS(W, "val") || u.getAttribute("w:val") || "single") !== "none";
      return ul && t.trim() ? t.replace(/^(\s*)(.*?)(\s*)$/s, "$1<u>$2</u>$3") : t;
    };
    const paraText = p => [...p.getElementsByTagNameNS(W, "r")].map(runText).join("").replace(/<\/u><u>/g, "");
    const out = [];
    const body = doc.getElementsByTagNameNS(W, "body")[0];
    for (const n of (body ? body.children : [])) {
      if (n.localName === "p") out.push(paraText(n));
      else if (n.localName === "tbl")
        for (const tr of n.getElementsByTagNameNS(W, "tr"))
          out.push([...tr.getElementsByTagNameNS(W, "tc")].map(tc => [...tc.getElementsByTagNameNS(W, "p")].map(paraText).join(" ").trim()).join("\t"));
    }
    return out.join("\n");
  }
  async function readFile(f) {
    if (/\.docx$/i.test(f.name)) {
      const xml = await zipEntry(await f.arrayBuffer(), "word/document.xml");
      if (!xml) throw new Error("워드(.docx) 파일이 아닙니다.");
      return docxToText(xml);
    }
    if (/\.hwpx?$/i.test(f.name)) throw new Error("한글 파일은 바로 못 엽니다. 한글에서 '다른 이름으로 저장 → .docx'로 바꿔 주세요.");
    return await f.text();
  }

  const SAMPLE = `11월 2주 클리닉 — 표현의 자유
[1~2] 다음 글을 읽고 물음에 답하시오.
(지문 첫째 문단)

(지문 둘째 문단)
1. 윗글의 내용과 일치하는 것은?
① 선지 ② 선지 ③ 선지 ④ 선지 ⑤ 선지
정답: ④
해설: 2문단에서 …
1-A. (1번과 같은 개념을 다른 사례로 묻는 유사 문제)
① 선지 ② 선지 ③ 선지 ④ 선지 ⑤ 선지
정답: ②
해설: …
1-B. (두 번째 유사 문제)
① 선지 ② 선지 ③ 선지 ④ 선지 ⑤ 선지
정답: ⑤
2. 〈보기〉를 바탕으로 윗글을 이해한 내용으로 적절하지 않은 것은? [3점]
〈보기〉 (보기 내용)
① 선지 ② 선지 ③ 선지 ④ 선지 ⑤ 선지
정답: ③
2-A. (유사 문제)
① 선지 ② 선지 ③ 선지 ④ 선지 ⑤ 선지
정답: ①
`;

  // ── 학생별 유사 문제지(출력용) ──
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = s => esc(s).replace(/&lt;u&gt;/g, "<u>").replace(/&lt;\/u&gt;/g, "</u>").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/__(.+?)__/g, "<u>$1</u>").replace(/\n/g, "<br>");
  function printHTML(bank, wrong, student, opt) {
    opt = opt || {};
    const pById = id => (bank.passages || []).find(p => p.id === id);
    const items = (wrong || []).map(no => bank.items.find(i => i.no === no)).filter(Boolean);
    const day = new Date().toLocaleDateString("ko-KR");
    let html = `<div class="pr-head"><div><b>오답 쌍둥이 클리닉 · 유사 문제</b><br><span>${esc(bank.title)}</span></div>
      <div class="pr-who">이름 <b>${esc(student || "")}</b><br>${esc(day)}</div></div>`;
    if (!items.length) return html + `<p>틀린 문항이 없어 유사 문제가 없습니다.</p>`;
    html += `<p class="pr-note">틀린 문항 ${items.map(i => i.no + "번").join(", ")} — 문항마다 같은 개념을 묻는 유사 문제입니다.</p>`;
    let lastP = "", n = 0;
    const answers = [];
    for (const it of items) {
      for (const v of it.variants) {
        const pid = v.passage || it.passage;
        if (pid && pid !== lastP) {
          const p = pById(pid);
          if (p) html += `<div class="pr-pas"><div class="pr-lead">${inline(p.lead)}</div>${p.text.split(/\n\s*\n/).map(x => `<p>${inline(x.trim())}</p>`).join("")}</div>`;
          lastP = pid;
        }
        n++;
        answers.push(`${n}. ${C[v.answer - 1] || "?"} (원 ${it.no}번)`);
        html += `<div class="pr-q"><div class="pr-stem"><b>${n}.</b> ${inline(v.stem)} <span class="pr-tag">원 ${it.no}번</span>${v.points === 3 ? " [3점]" : ""}</div>
          ${(v.box || []).length ? `<div class="pr-box">${v.box.map(b => `<div>${inline(b)}</div>`).join("")}</div>` : ""}
          <div class="pr-ch">${v.choices.map((c, i) => `<div>${C[i]} ${inline(c)}</div>`).join("")}</div></div>`;
      }
    }
    html += `<div class="pr-omr">답: ${Array.from({ length: n }, (_, i) => `<span>${i + 1}. ( &nbsp; )</span>`).join("")}</div>`;
    if (opt.withAnswers) html += `<div class="pr-ans"><b>정답 (선생님용)</b><br>${answers.map(esc).join(" · ")}</div>`;
    return html;
  }

  return { parse, parseAuto, readFile, printHTML, SAMPLE };
})();
