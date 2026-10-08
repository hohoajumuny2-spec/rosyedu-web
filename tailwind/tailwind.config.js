// 💡 화면의 Tailwind 글자(bg-..., text-... 같은 이름)를 미리 CSS 파일 하나로 만들어 둔다.
//    예전에는 cdn.tailwindcss.com 이 학생 휴대폰에서 매번 HTML 전체를 훑어 CSS를 만들었고,
//    그동안 첫 화면이 하얗게/깨진 채로 멈춰 있었다.
//    index.html·proctor.html 을 고친 뒤에는 tailwind.css 를 다시 만들어야 한다
//    (main 에 올리면 GitHub Actions 가 알아서 다시 만든다. 손으로는 README 대신 아래 명령):
//      npx tailwindcss@3.4.17 -c tailwind/tailwind.config.js -i tailwind/input.css -o tailwind.css --minify
module.exports = {
  content: ['./index.html', './proctor.html'],
  // 글자 조각을 이어 붙여 만드는 이름은 파일에 통째로 적혀 있지 않아 빠지므로 여기 적어 둔다.
  safelist: [
    // 프로그램 소개 상자(info.색)·시험 D-day 카드(색/시험색)
    { pattern: /^(bg|border|text)-(red|amber|orange|yellow|emerald|teal|cyan|blue|purple|pink|rose)-(300|400|700|900)(\/(15|20|50|60|80))?$/ },
    // 성적 입력 줄의 칸 너비(col-span-${span})
    { pattern: /^col-span-([1-9]|1[0-2])$/ },
  ],
  theme: { extend: {} },
  plugins: [],
};
