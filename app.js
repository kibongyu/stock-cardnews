

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
      slides.map(s => "• " + s).join("<br>");

    drawImage(bestTitle, slides);

    status.innerText = "✅ 완료!";
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

  } catch (err) {
    console.error(err);
    status.innerText = "❌ 오류 발생: " + err.message;
  }
}

// 🔥 이 함수만 바뀜
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

// 아래는 그대로 유지
async function generateTitles(text) {
  const prompt = `
  주식 카드뉴스 제목 3개 생성
  - 20자 이하
  - 클릭 유도
  내용:${text}
  `;

  const res = await callGPT(prompt);
  return res.split("\n").filter(t => t.trim() !== "");
}

async function pickBestTitle(titles) {
  const prompt = `
  다음 중 가장 좋은 제목 1개만 선택:
  ${titles.join("\n")}
  `;

  return await callGPT(prompt);
}

async function generateSlides(text) {
  const prompt = `
  카드뉴스 5줄 생성
  - 각 30자 이하
  - 긍정 + 리스크 포함
  ${text}
  `;

  const res = await callGPT(prompt);
  return res.split("\n").filter(t => t.trim() !== "");
}

function drawImage(title, slides) {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 50px Arial";

  wrapText(ctx, title, 50, 120, 900, 60);

  slides.forEach((s, i) => {
    wrapText(ctx, s, 50, 300 + i * 120, 900, 50);
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function download() {
  const canvas = document.getElementById("canvas");
  const link = document.createElement("a");
  link.download = "cardnews.png";
  link.href = canvas.toDataURL();
  link.click();
}