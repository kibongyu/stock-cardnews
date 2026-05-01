// 👉 실행
async function run() {
  const input = document.getElementById("input").value;
  const status = document.getElementById("status");

  if (!input) {
    status.innerText = "❗ 종목명을 입력하세요 (예: 삼성전자)";
    return;
  }

  try {
    status.innerText = "📰 뉴스 수집 중...";

    const news = await getNews(input);

    status.innerText = "🤖 카드뉴스 생성 중...";

    const titles = await generateTitles(input, news);
    const bestTitle = await pickBestTitle(titles);

    document.getElementById("title").innerText = bestTitle;

    const slides = await generateSlides(input, news);

    document.getElementById("slides").innerHTML =
      slides.map((s, i) => `${i + 1}. ${s}`).join("<br><br>");

    drawSlides(bestTitle, slides);

    status.innerText = "✅ 완료!";
  } catch (err) {
    console.error(err);
    status.innerText = "❌ 오류: " + err.message;
  }
}

////////////////////////////////////////////////////
// 👉 뉴스 가져오기 (Google RSS)
////////////////////////////////////////////////////
async function getNews(keyword) {
  const url = `https://api.allorigins.win/get?url=${encodeURIComponent(
    `https://news.google.com/rss/search?q=${keyword}&hl=ko&gl=KR&ceid=KR:ko`
  )}`;

  const res = await fetch(url);
  const data = await res.json();

  const parser = new DOMParser();
  const xml = parser.parseFromString(data.contents, "text/xml");

  const items = xml.querySelectorAll("item");

  let news = [];

  items.forEach((item, i) => {
    if (i < 5) {
      news.push({
        title: item.querySelector("title").textContent,
        desc: item.querySelector("description").textContent
      });
    }
  });

  if (news.length === 0) throw new Error("뉴스 없음");

  return news;
}

////////////////////////////////////////////////////
// 👉 Worker 호출
////////////////////////////////////////////////////
async function callGPT(prompt) {
  const res = await fetch("https://rough-darkness-c973.loadbong.workers.dev", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
  });

  if (!res.ok) throw new Error("Worker 오류");

  const data = await res.json();

  return data.choices[0].message.content;
}

////////////////////////////////////////////////////
// 👉 제목 생성
////////////////////////////////////////////////////
async function generateTitles(text, news) {
  const newsText = news.map(n => n.title).join("\n");

  const prompt = `
  아래 뉴스 기반으로 주식 카드뉴스 제목 3개 생성

  ${newsText}

  조건:
  - 20자 이내
  - 클릭 유도
  - 실제 이슈 반영
  `;

  const res = await callGPT(prompt);
  return res.split("\n").filter(t => t.trim());
}

////////////////////////////////////////////////////
// 👉 제목 선택
////////////////////////////////////////////////////
async function pickBestTitle(titles) {
  const prompt = `
  가장 클릭률 높은 제목 1개 선택:

  ${titles.join("\n")}
  `;

  return await callGPT(prompt);
}

////////////////////////////////////////////////////
// 👉 카드뉴스 생성 (핵심)
////////////////////////////////////////////////////
async function generateSlides(text, news) {

  const newsText = news.map(n =>
    `제목:${n.title}\n내용:${n.desc}`
  ).join("\n\n");

  const prompt = `
  아래 실제 뉴스 기반으로 카드뉴스 5장 생성

  ${newsText}

  조건:
  - 5줄 출력
  - 각 줄 = 카드 1장
  - 반드시 기업명 포함
  - 상승 이유, 리스크 포함
  - 추상적인 말 금지

  형식:
  1. 핵심 이슈
  2. 상승 이유
  3. 추가 이유
  4. 리스크
  5. 투자 포인트
  `;

  const res = await callGPT(prompt);
  return res.split("\n").filter(t => t.trim());
}

////////////////////////////////////////////////////
// 👉 이미지 5장 생성
////////////////////////////////////////////////////
function drawSlides(title, slides) {
  const container = document.getElementById("images");
  container.innerHTML = "";

  slides.forEach((slide) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 1080, 1080);

    // 제목
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 48px Arial";
    wrapText(ctx, title, 60, 120, 960, 60);

    // 내용
    ctx.fillStyle = "#fff";
    ctx.font = "bold 42px Arial";
    wrapText(ctx, slide, 60, 400, 960, 60);

    container.appendChild(canvas);
  });
}

////////////////////////////////////////////////////
// 👉 줄바꿈
////////////////////////////////////////////////////
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

////////////////////////////////////////////////////
// 👉 다운로드
////////////////////////////////////////////////////
function downloadAll() {
  const canvases = document.querySelectorAll("#images canvas");

  canvases.forEach((canvas, i) => {
    const link = document.createElement("a");
    link.download = `card_${i + 1}.png`;
    link.href = canvas.toDataURL();
    link.click();
  });
}
