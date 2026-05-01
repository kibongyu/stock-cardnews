// 👉 실행
async function run() {
  const input = document.getElementById("input").value;
  const status = document.getElementById("status");

  if (!input) {
    status.innerText = "❗ 입력값이 필요합니다";
    return;
  }

  try {
    status.innerText = "⏳ 생성 중...";

    const titles = await generateTitles(input);
    const bestTitle = await pickBestTitle(titles);

    document.getElementById("title").innerText = bestTitle;

    const slides = await generateSlides(input);

    document.getElementById("slides").innerHTML =
      slides.map((s, i) => `${i + 1}. ${s}`).join("<br><br>");

    drawSlides(bestTitle, slides);

    status.innerText = "✅ 완료!";
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

  } catch (err) {
    console.error(err);
    status.innerText = "❌ 오류 발생: " + err.message;
  }
}

// 👉 Worker 호출
async function callGPT(prompt) {
  const res = await fetch("https://rough-darkness-c973.loadbong.workers.dev", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
  });

  if (!res.ok) {
    throw new Error("Worker 오류: " + res.status);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.choices[0].message.content;
}

// 👉 제목 생성 (조회수용)
async function generateTitles(text) {
  const prompt = `
  "${text}" 관련 주식 카드뉴스 제목 3개 생성

  [조건]
  - 클릭 유도형
  - 실제 이슈 기반
  - 20자 이내
  - 자극적 문장 허용

  예시:
  "삼성전자 왜 급등했나"
  "지금 반드시 봐야 할 이유"

  내용:
  ${text}
  `;

  const res = await callGPT(prompt);
  return res.split("\n").filter(t => t.trim() !== "");
}

// 👉 제목 선택
async function pickBestTitle(titles) {
  const prompt = `
  다음 제목 중 클릭률 가장 높은 1개만 선택:

  ${titles.join("\n")}
  `;

  return await callGPT(prompt);
}

// 👉 카드뉴스 생성 (핵심)
async function generateSlides(text) {
  const prompt = `
  "${text}" 관련 실제 주식 이슈 기반 카드뉴스 작성

  [조건]
  - 총 5페이지
  - 각 줄 = 카드 1장
  - 반드시 실제 이유 포함
  - 기업명 / 수치 / 이슈 포함
  - 추상적인 말 금지

  [형식]
  1. 왜 상승했나 (핵심)
  2. 상승 이유 1
  3. 상승 이유 2
  4. 리스크
  5. 지금 봐야 하는 이유

  내용:
  ${text}
  `;

  const res = await callGPT(prompt);
  return res.split("\n").filter(t => t.trim() !== "");
}

// 👉 여러 장 이미지 생성 (핵심 개선)
function drawSlides(title, slides) {
  const container = document.getElementById("images");
  container.innerHTML = "";

  slides.forEach((slide, index) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;

    const ctx = canvas.getContext("2d");

    // 배경
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

// 👉 줄바꿈
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

// 👉 전체 다운로드 (여러 장)
function downloadAll() {
  const canvases = document.querySelectorAll("#images canvas");

  canvases.forEach((canvas, i) => {
    const link = document.createElement("a");
    link.download = `card_${i + 1}.png`;
    link.href = canvas.toDataURL();
    link.click();
  });
}
