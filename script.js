document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = [...document.querySelectorAll(".tab-button")];
  const panels = [...document.querySelectorAll(".tab-panel")];

  function activateTab(name, moveFocus = false) {
    const selectedButton = tabButtons.find((button) => button.dataset.tab === name);
    if (!selectedButton) return;

    tabButtons.forEach((button) => {
      const active = button === selectedButton;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.id === selectedButton.getAttribute("aria-controls");
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    if (moveFocus) selectedButton.focus();
    if (name === "presisi") drawEpsilonGraph();
  }

  tabButtons.forEach((button, index) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
    button.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabButtons.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabButtons.length - 1;
      else return;
      event.preventDefault();
      activateTab(tabButtons[nextIndex].dataset.tab, true);
    });
  });

  document.querySelectorAll("[data-tab-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      activateTab(link.dataset.tabLink);
      document.querySelector("#materi").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const functionSelect = document.querySelector("#function-select");
  const xSlider = document.querySelector("#x-slider");
  const xOutput = document.querySelector("#x-value");
  const equationOutput = document.querySelector("#simulator-equation");
  const statusOutput = document.querySelector("#simulator-status");
  const analysisOutput = document.querySelector("#simulator-analysis");

  function updateSimulator() {
    const x = Number(xSlider.value);
    const xText = x.toFixed(2);
    const atOne = Math.abs(x - 1) < 0.005;
    xOutput.value = xText;
    xOutput.textContent = xText;
    statusOutput.classList.remove("undefined");

    if (functionSelect.value === "rational") {
      if (atOne) {
        equationOutput.innerHTML = "f(1.00) = <strong>tidak terdefinisi</strong>";
        statusOutput.classList.add("undefined");
        statusOutput.innerHTML = '<span class="status-dot"></span> Penyebut bernilai nol';
        analysisOutput.textContent = "Namun, saat x mendekati 1 dari kiri maupun kanan, f(x) mendekati 2.";
      } else {
        const value = x + 1;
        equationOutput.innerHTML = `f(${xText}) = <strong>${value.toFixed(2)}</strong>`;
        statusOutput.innerHTML = '<span class="status-dot"></span> Nilai fungsi terdefinisi';
        analysisOutput.textContent = "Saat x mendekati 1 dari kedua arah, f(x) mendekati 2.";
      }
      return;
    }

    if (atOne) {
      equationOutput.innerHTML = "f(1.00) = <strong>3.00</strong>";
      statusOutput.classList.add("undefined");
      statusOutput.innerHTML = '<span class="status-dot"></span> Limit dua sisi tidak ada';
      analysisOutput.textContent = "Dari kiri nilainya mendekati 2, sedangkan dari kanan mendekati 3.";
    } else if (x < 1) {
      const value = x + 1;
      equationOutput.innerHTML = `f(${xText}) = <strong>${value.toFixed(2)}</strong>`;
      statusOutput.innerHTML = '<span class="status-dot"></span> Dari kiri: limit mendekati 2';
      analysisOutput.textContent = "Untuk x < 1, f(x) = x + 1. Di x = 1 fungsi memiliki loncatan.";
    } else {
      const value = x + 2;
      equationOutput.innerHTML = `f(${xText}) = <strong>${value.toFixed(2)}</strong>`;
      statusOutput.innerHTML = '<span class="status-dot"></span> Dari kanan: limit mendekati 3';
      analysisOutput.textContent = "Untuk x > 1, f(x) = x + 2. Di x = 1 fungsi memiliki loncatan.";
    }
  }

  xSlider.addEventListener("input", updateSimulator);
  functionSelect.addEventListener("change", updateSimulator);
  updateSimulator();

  const limitForm = document.querySelector("#limit-form");
  const limitExpression = document.querySelector("#limit-expression");
  const limitPoint = document.querySelector("#limit-point");
  const limitResult = document.querySelector("#limit-result");

  function parseLimitExpression(expression, xValue) {
    const tokens = [];
    const tokenPattern = /([0-9]+(?:\.[0-9]*)?|\.[0-9]+|[a-z]+|[()+\-*/^])/iy;
    let offset = 0;

    while (offset < expression.length) {
      const whitespace = expression.slice(offset).match(/^\s+/);
      if (whitespace) offset += whitespace[0].length;
      if (offset >= expression.length) break;

      tokenPattern.lastIndex = offset;
      const match = tokenPattern.exec(expression);
      if (!match) throw new Error("Gunakan hanya angka, x, operasi dasar, pangkat, sqrt, dan tanda kurung.");
      tokens.push(match[1].toLowerCase());
      offset = tokenPattern.lastIndex;
    }
    if (tokens.length === 0) throw new Error("Masukkan fungsi yang ingin dihitung.");

    let position = 0;
    const peek = () => tokens[position];

    function parsePrimary() {
      const token = peek();
      if (token === undefined) throw new Error("Ada bagian fungsi yang belum lengkap.");
      if (token === "(") {
        position += 1;
        const value = parseExpression();
        if (peek() !== ")") throw new Error("Periksa kembali tanda kurung pada fungsi.");
        position += 1;
        return value;
      }
      if (token === "x") {
        position += 1;
        return xValue;
      }
      if (token === "sqrt") {
        position += 1;
        if (peek() !== "(") throw new Error("Tulis akar sebagai sqrt(...).");
        position += 1;
        const value = parseExpression();
        if (peek() !== ")") throw new Error("Periksa kembali tanda kurung pada sqrt(...).");
        position += 1;
        return Math.sqrt(value);
      }
      if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
        position += 1;
        return Number(token);
      }
      throw new Error(`Bagian fungsi "${token}" belum didukung.`);
    }

    function parsePower() {
      const base = parsePrimary();
      if (peek() !== "^") return base;
      position += 1;
      return base ** parseUnary();
    }

    function parseUnary() {
      if (peek() === "+") {
        position += 1;
        return parseUnary();
      }
      if (peek() === "-") {
        position += 1;
        return -parseUnary();
      }
      return parsePower();
    }

    function parseTerm() {
      let value = parseUnary();
      while (position < tokens.length) {
        if (peek() === "*") {
          position += 1;
          value *= parseUnary();
        } else if (peek() === "/") {
          position += 1;
          value /= parseUnary();
        } else if (peek() === "x" || peek() === "(" || peek() === "sqrt" || /^\d/.test(peek())) {
          value *= parseUnary();
        } else {
          break;
        }
      }
      return value;
    }

    function parseExpression() {
      let value = parseTerm();
      while (peek() === "+" || peek() === "-") {
        const operator = tokens[position];
        position += 1;
        const nextValue = parseTerm();
        value = operator === "+" ? value + nextValue : value - nextValue;
      }
      return value;
    }

    const result = parseExpression();
    if (position !== tokens.length) throw new Error(`Periksa kembali bagian "${tokens[position]}".`);
    return result;
  }

  function estimateLimitSide(values) {
    if (values.some((value) => !Number.isFinite(value))) return { converges: false };
    const tail = values.slice(-3);
    const scale = Math.max(1, ...tail.map(Math.abs));
    const converges = Math.abs(tail[2] - tail[1]) <= scale * 0.01
      && Math.abs(tail[1] - tail[0]) <= scale * 0.01;
    return { converges, value: tail[2] };
  }

  function formatLimitValue(value) {
    if (Object.is(value, -0)) return "0";
    return Number(value.toPrecision(6)).toString();
  }

  function showLimitError(message) {
    limitResult.replaceChildren();
    const error = document.createElement("p");
    error.className = "limit-result-error";
    error.textContent = message;
    limitResult.append(error);
    limitResult.hidden = false;
  }

  limitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const expression = limitExpression.value.trim();
    const point = Number(limitPoint.value);
    if (!Number.isFinite(point)) {
      showLimitError("Titik pendekatan harus berupa angka yang valid.");
      return;
    }

    const distances = [0.1, 0.01, 0.001, 0.0001, 0.00001];
    let leftValues;
    let rightValues;
    try {
      leftValues = distances.map((distance) => parseLimitExpression(expression, point - distance));
      rightValues = distances.map((distance) => parseLimitExpression(expression, point + distance));
    } catch (error) {
      showLimitError(error.message);
      return;
    }

    const leftLimit = estimateLimitSide(leftValues);
    const rightLimit = estimateLimitSide(rightValues);
    const bothConverge = leftLimit.converges && rightLimit.converges;
    const sameLimit = bothConverge
      && Math.abs(leftLimit.value - rightLimit.value) <= Math.max(1, Math.abs(leftLimit.value), Math.abs(rightLimit.value)) * 0.01;

    limitResult.replaceChildren();
    const heading = document.createElement("h4");
    heading.textContent = `Pemeriksaan numerik saat x mendekati ${formatLimitValue(point)}`;
    limitResult.append(heading);

    const tableWrap = document.createElement("div");
    tableWrap.className = "limit-table-wrap";
    const table = document.createElement("table");
    table.className = "limit-approach-table";
    const header = table.insertRow();
    ["Jarak ke titik", "Dari kiri: f(x)", "Dari kanan: f(x)"].forEach((label) => {
      const cell = document.createElement("th");
      cell.textContent = label;
      header.append(cell);
    });
    [1, 3, 4].forEach((index) => {
      const row = table.insertRow();
      [
        formatLimitValue(distances[index]),
        formatLimitValue(leftValues[index]),
        formatLimitValue(rightValues[index])
      ].forEach((value) => {
        const cell = row.insertCell();
        cell.textContent = value;
      });
    });
    tableWrap.append(table);
    limitResult.append(tableWrap);

    const conclusion = document.createElement("p");
    conclusion.className = sameLimit ? "limit-result-conclusion" : "limit-result-conclusion limit-result-error";
    if (sameLimit) {
      conclusion.textContent = `Kedua sisi mendekati nilai yang sama. Perkiraan limit: ${formatLimitValue((leftLimit.value + rightLimit.value) / 2)}.`;
    } else if (bothConverge) {
      conclusion.textContent = `Perkiraan dari kiri (${formatLimitValue(leftLimit.value)}) dan kanan (${formatLimitValue(rightLimit.value)}) berbeda; limit dua sisi tidak ada.`;
    } else {
      conclusion.textContent = "Pendekatan numerik ini belum cukup untuk memastikan limit dua sisi ada. Periksa nilai dari kiri dan kanan pada tabel.";
    }
    limitResult.append(conclusion);

    const note = document.createElement("p");
    note.className = "limit-result-note";
    note.textContent = "Ini perkiraan dari nilai fungsi di sekitar titik, bukan bukti limit secara aljabar. Fitur ini mendukung operasi dasar, pangkat, dan sqrt(...).";
    limitResult.append(note);
    limitResult.hidden = false;
  });

  const epsilonSlider = document.querySelector("#epsilon-slider");
  const epsilonOutput = document.querySelector("#epsilon-value");
  const deltaOutput = document.querySelector("#delta-value");
  const canvas = document.querySelector("#epsilon-canvas");
  const context = canvas.getContext("2d");

  function drawEpsilonGraph() {
    if (!context || !canvas.clientWidth) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const epsilon = Number(epsilonSlider.value);
    const delta = epsilon / 3;
    epsilonOutput.value = epsilon.toFixed(2);
    epsilonOutput.textContent = epsilon.toFixed(2);
    deltaOutput.value = delta.toFixed(2);
    deltaOutput.textContent = delta.toFixed(2);

    const padding = { left: 38, right: 14, top: 15, bottom: 26 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const xMin = 1.4;
    const xMax = 4.6;
    const yMin = -3;
    const yMax = 7;
    const xToCanvas = (x) => padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
    const yToCanvas = (y) => padding.top + ((yMax - y) / (yMax - yMin)) * plotHeight;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fcfcfe";
    context.fillRect(0, 0, width, height);

    const epsilonTop = yToCanvas(2 + epsilon);
    const epsilonBottom = yToCanvas(2 - epsilon);
    context.fillStyle = "rgba(115, 85, 232, 0.10)";
    context.fillRect(padding.left, epsilonTop, plotWidth, epsilonBottom - epsilonTop);
    context.fillStyle = "rgba(115, 85, 232, 0.11)";
    context.fillRect(xToCanvas(3 - delta), padding.top, xToCanvas(3 + delta) - xToCanvas(3 - delta), plotHeight);

    context.lineWidth = 1;
    context.strokeStyle = "#e9eaf1";
    context.fillStyle = "#9298a8";
    context.font = '9px "DM Sans", sans-serif';
    context.textAlign = "center";
    [1.5, 2.5, 3, 3.5, 4.5].forEach((x) => {
      const px = xToCanvas(x);
      context.beginPath();
      context.moveTo(px, padding.top);
      context.lineTo(px, height - padding.bottom);
      context.stroke();
      context.fillText(x === 3 ? "c = 3" : String(x), px, height - 9);
    });
    [-2, 0, 2, 4, 6].forEach((y) => {
      const py = yToCanvas(y);
      context.beginPath();
      context.moveTo(padding.left, py);
      context.lineTo(width - padding.right, py);
      context.stroke();
      context.textAlign = "right";
      context.fillText(String(y), padding.left - 7, py + 3);
    });

    context.save();
    context.setLineDash([4, 4]);
    context.strokeStyle = "#ac9be9";
    context.lineWidth = 1;
    [2 - epsilon, 2 + epsilon].forEach((y) => {
      context.beginPath();
      context.moveTo(padding.left, yToCanvas(y));
      context.lineTo(width - padding.right, yToCanvas(y));
      context.stroke();
    });
    [3 - delta, 3 + delta].forEach((x) => {
      context.beginPath();
      context.moveTo(xToCanvas(x), padding.top);
      context.lineTo(xToCanvas(x), height - padding.bottom);
      context.stroke();
    });
    context.restore();

    context.beginPath();
    context.strokeStyle = "#7355e8";
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.moveTo(xToCanvas(xMin), yToCanvas(3 * xMin - 7));
    context.lineTo(xToCanvas(xMax), yToCanvas(3 * xMax - 7));
    context.stroke();

    context.beginPath();
    context.fillStyle = "#7355e8";
    context.arc(xToCanvas(3), yToCanvas(2), 3.5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#777d8d";
    context.textAlign = "left";
    context.fillText("L = 2", xToCanvas(3) + 7, yToCanvas(2) - 7);
  }

  epsilonSlider.addEventListener("input", drawEpsilonGraph);
  window.addEventListener("resize", drawEpsilonGraph);
  if ("ResizeObserver" in window) {
    new ResizeObserver(drawEpsilonGraph).observe(canvas.parentElement);
  }
  drawEpsilonGraph();

  const solutions = {
    substitusi: {
      title: "Substitusi langsung",
      steps: [
        "Periksa fungsi f(x) = x² + 3x − 1. Fungsi polinomial kontinu, sehingga substitusi langsung dapat digunakan.",
        "Ganti setiap x dengan 2: 2² + 3(2) − 1.",
        "Hitung: 4 + 6 − 1 = 9."
      ],
      result: "Jadi, lim x→2 (x² + 3x − 1) = 9."
    },
    faktorisasi: {
      title: "Metode pemfaktoran",
      steps: [
        "Substitusi x = 1 menghasilkan (1² − 1)/(1 − 1) = 0/0, yaitu bentuk tak tentu.",
        "Faktorkan pembilang sebagai selisih dua kuadrat: x² − 1 = (x − 1)(x + 1).",
        "Untuk x ≠ 1, coret faktor yang sama (x − 1), sehingga tersisa x + 1.",
        "Substitusikan x = 1 pada bentuk sederhana: 1 + 1 = 2."
      ],
      result: "Jadi, limitnya adalah 2. Nilai fungsi di x = 1 tidak menentukan limit."
    },
    sekawan: {
      title: "Perkalian sekawan",
      steps: [
        "Substitusi x = 0 memberi bentuk 0/0. Kalikan pembilang dan penyebut dengan sekawan √(x + 4) + 2.",
        "Gunakan identitas (a − b)(a + b) = a² − b². Pembilang menjadi (x + 4) − 4 = x.",
        "Untuk x ≠ 0, sederhanakan x/x sehingga diperoleh 1/(√(x + 4) + 2).",
        "Substitusikan x = 0: 1/(√4 + 2) = 1/4."
      ],
      result: "Jadi, limitnya adalah 1/4."
    }
  };

  const solutionDialog = document.querySelector("#solution-dialog");
  const dialogTitle = document.querySelector("#dialog-title");
  const dialogContent = document.querySelector("#dialog-content");

  function renderMath(element) {
    if (window.renderMathInElement) {
      window.renderMathInElement(element, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false
      });
    }
  }

  document.querySelectorAll(".solution-button").forEach((button) => {
    button.addEventListener("click", () => {
      const solution = solutions[button.dataset.solution];
      if (!solution) return;
      dialogTitle.textContent = solution.title;
      dialogContent.innerHTML = solution.steps.map((step, index) =>
        `<div class="solution-step"><span>${index + 1}</span><span>${step}</span></div>`
      ).join("") + `<div class="solution-result">${solution.result}</div>`;
      solutionDialog.showModal();
      renderMath(dialogContent);
    });
  });

  solutionDialog.querySelector(".dialog-close").addEventListener("click", () => solutionDialog.close());
  solutionDialog.addEventListener("click", (event) => {
    if (event.target === solutionDialog) solutionDialog.close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && solutionDialog.open) solutionDialog.close();
  });

  const answerKey = ["b", "b", "b"];
  const explanations = [
    "Substitusi langsung: 3(2) + 1 = 7.",
    "Faktorkan x² − 1 = (x − 1)(x + 1), sederhanakan, lalu substitusikan x = 1. Hasilnya 2.",
    "Untuk f(x) = 3x − 7, berlaku |f(x) − 2| = 3|x − 3|. Pilih δ = ε/3 = 0.1."
  ];
  const quizForm = document.querySelector("#quiz-form");
  const quizScore = document.querySelector("#quiz-score");

  quizForm.addEventListener("submit", (event) => {
    event.preventDefault();
    let correctCount = 0;
    document.querySelectorAll(".quiz-question").forEach((question, index) => {
      const selected = question.querySelector('input[type="radio"]:checked');
      const correct = selected?.value === answerKey[index];
      if (correct) correctCount += 1;

      question.querySelectorAll(".answer-option").forEach((option) => {
        option.classList.remove("correct", "incorrect");
        option.querySelector(".answer-feedback").textContent = "";
        const input = option.querySelector("input");
        if (input.value === answerKey[index]) {
          option.classList.add("correct");
          option.querySelector(".answer-feedback").textContent = "Benar";
        } else if (input.checked) {
          option.classList.add("incorrect");
          option.querySelector(".answer-feedback").textContent = "Jawabanmu";
        }
      });

      const explanation = question.querySelector(".question-explanation");
      explanation.textContent = `${selected ? (correct ? "Tepat!" : "Belum tepat.") : "Belum dijawab."} ${explanations[index]}`;
      explanation.classList.add("visible");
    });
    quizScore.textContent = `Skor: ${Math.round((correctCount / answerKey.length) * 100)} / 100`;
  });

  document.querySelector("#reset-quiz").addEventListener("click", () => {
    quizForm.reset();
    quizScore.textContent = "";
    document.querySelectorAll(".quiz-question").forEach((question) => {
      question.querySelectorAll(".answer-option").forEach((option) => option.classList.remove("correct", "incorrect"));
      question.querySelectorAll(".answer-feedback").forEach((feedback) => feedback.textContent = "");
      const explanation = question.querySelector(".question-explanation");
      explanation.textContent = "";
      explanation.classList.remove("visible");
    });
  });

  renderMath(document.body);
});
