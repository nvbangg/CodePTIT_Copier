const GRADE_THRESHOLDS = [
  { min: 9.0, scale4: 4.0, letter: "A+" },
  { min: 8.5, scale4: 3.7, letter: "A" },
  { min: 8.0, scale4: 3.5, letter: "B+" },
  { min: 7.0, scale4: 3.0, letter: "B" },
  { min: 6.5, scale4: 2.5, letter: "C+" },
  { min: 5.5, scale4: 2.0, letter: "C" },
  { min: 5.0, scale4: 1.5, letter: "D+" },
  { min: 4.0, scale4: 1.0, letter: "D" },
  { min: 0.0, scale4: 0.0, letter: "F" },
];

const CALC_SESSION_KEY = "ptit_calc_session_rows";

const roundTo = (value, digits) => {
  const factor = 10 ** digits;
  return Math.round((value + 1e-9) * factor) / factor;
};

const convertGrade = (score10) =>
  GRADE_THRESHOLDS.find((threshold) => score10 >= threshold.min) || GRADE_THRESHOLDS.at(-1);

export const initGradeCalculator = async () => {
  const calcCardEl = document.getElementById("calc-card");
  const gradeListEl = document.getElementById("grade-list");
  const rowTpl = document.getElementById("grade-row-tpl");
  const weightStatEl = document.getElementById("weight-stat");
  const resScale10El = document.getElementById("res-scale10");
  const resScale4El = document.getElementById("res-scale4");
  const resLetterEl = document.getElementById("res-letter");
  const exactInfoEl = document.getElementById("exact-scale10-help");
  const presetChipEls = document.querySelectorAll(".preset-chip");

  if (!calcCardEl || !gradeListEl || !rowTpl) return;

  const saveTempState = (rowsData) => {
    chrome.storage?.session?.set({ [CALC_SESSION_KEY]: rowsData }).catch(() => {});
  };

  const updatePresetChips = (currentWeights) => {
    presetChipEls.forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.weights === currentWeights);
    });
  };

  const calcGrades = () => {
    const rowEls = gradeListEl.querySelectorAll(".grade-row");
    const rowsData = [];
    const weightInputs = [];
    let totalWeight = 0;
    let weightedSum = 0;
    let hasScore = false;
    let isInvalid = false;
    let isMissing = false;
    let hasEmptyWeight = false;
    let hasInvalidWeight = false;

    rowEls.forEach((rowEl) => {
      const weightInput = rowEl.querySelector(".weight-input");
      const scoreInput = rowEl.querySelector(".score-input");
      const weightVal = weightInput?.value.trim() ?? "";
      const scoreVal = scoreInput?.value.trim() ?? "";
      const weight = parseFloat(weightVal);
      const score = parseFloat(scoreVal);

      if (weightInput) weightInputs.push(weightInput);
      rowsData.push({ weight: weightVal, score: scoreVal });

      const isWeightEmpty = weightVal === "";
      const isWeightInvalid = !isWeightEmpty && (isNaN(weight) || weight <= 0 || weight > 100);
      weightInput?.classList.toggle("invalid", isWeightInvalid);

      if (isWeightEmpty) {
        isMissing = true;
        hasEmptyWeight = true;
      } else if (isWeightInvalid) {
        isInvalid = true;
        hasInvalidWeight = true;
      } else {
        totalWeight += weight;
      }

      const isScoreEmpty = scoreVal === "";
      const isScoreInvalid = !isScoreEmpty && (isNaN(score) || score < 0 || score > 10);
      scoreInput?.classList.toggle("invalid", isScoreInvalid);

      if (isScoreEmpty) isMissing = true;
      else if (isScoreInvalid) isInvalid = true;

      if (!isScoreEmpty && !isNaN(score)) {
        hasScore = true;
        const curWeight = !isNaN(weight) && weight > 0 ? weight : 0;
        weightedSum += score * curWeight;
      }
    });

    const roundedWeight = Math.round(totalWeight * 100) / 100;
    if (roundedWeight > 100 || (!isMissing && roundedWeight !== 100)) isInvalid = true;

    const isWeightValid = !hasEmptyWeight && !hasInvalidWeight && roundedWeight === 100;
    weightInputs.forEach((input) => input.classList.toggle("valid", isWeightValid));

    if (isInvalid) {
      weightStatEl.textContent = "Nhập không hợp lệ";
      weightStatEl.className = "weight-stat invalid";
    } else if (isMissing) {
      weightStatEl.textContent = "Nhập thiếu";
      weightStatEl.className = "weight-stat missing";
    } else {
      weightStatEl.textContent = "";
      weightStatEl.className = "weight-stat";
    }

    if (hasScore) {
      const exactScore = weightedSum / 100;
      const round10 = roundTo(exactScore, 1);
      const grade = convertGrade(round10);
      resScale10El.textContent = round10.toFixed(1);
      resScale4El.textContent = grade.scale4.toFixed(1);
      resLetterEl.textContent = grade.letter;
      resLetterEl.dataset.grade = grade.letter;

      const exactScoreDisplay = roundTo(exactScore, 4);
      const isDiff = exactScoreDisplay !== round10;
      if (exactInfoEl) {
        exactInfoEl.style.display = isDiff ? "inline-flex" : "none";
        if (isDiff) exactInfoEl.title = `Điểm chính xác: ${exactScoreDisplay}`;
      }
    } else {
      resScale10El.textContent = "-";
      resScale4El.textContent = "-";
      resLetterEl.textContent = "-";
      resLetterEl.dataset.grade = "-";
      if (exactInfoEl) exactInfoEl.style.display = "none";
    }

    updatePresetChips(rowsData.map((row) => row.weight).join(","));
    saveTempState(rowsData);
  };

  const createRowEl = (weight = "", score = "") => {
    const rowEl = rowTpl.content.firstElementChild.cloneNode(true);
    const [weightInput, scoreInput] = rowEl.querySelectorAll(".grade-input");
    if (weight) weightInput.value = weight;
    if (score) scoreInput.value = score;
    return rowEl;
  };

  const renderRows = (rows) => {
    gradeListEl.replaceChildren(...rows.map((row) => createRowEl(row.weight, row.score)));
  };

  gradeListEl.addEventListener("input", (event) => {
    if (event.target.matches(".grade-input")) calcGrades();
  });

  gradeListEl.addEventListener(
    "wheel",
    (event) => {
      if (event.target.matches(".grade-input")) event.preventDefault();
    },
    { passive: false }
  );

  gradeListEl.addEventListener("click", (event) => {
    if (event.target.closest(".remove-row-btn") && gradeListEl.children.length > 1) {
      event.target.closest(".grade-row").remove();
      calcGrades();
    }
  });

  presetChipEls.forEach((chip) => {
    chip.addEventListener("click", () => {
      const weights = chip.dataset.weights.split(",");
      const currentScores = Array.from(
        gradeListEl.querySelectorAll(".score-input"),
        (input) => input.value.trim()
      );
      renderRows(weights.map((weight, index) => ({ weight, score: currentScores[index] || "" })));
      calcGrades();
    });
  });

  document.getElementById("add-row-btn")?.addEventListener("click", () => {
    const sumWeight = Array.from(gradeListEl.querySelectorAll(".weight-input")).reduce(
      (sum, input) => sum + (parseFloat(input.value) || 0),
      0
    );
    const remaining = Math.round((100 - sumWeight) * 100) / 100;
    const newRowEl = createRowEl(remaining > 0 ? remaining.toString() : "", "");
    gradeListEl.appendChild(newRowEl);
    calcGrades();
    newRowEl.querySelector(".weight-input")?.focus();
  });

  document.getElementById("calc-reset-btn")?.addEventListener("click", () => {
    const scoreInputs = gradeListEl.querySelectorAll(".score-input");
    scoreInputs.forEach((input) => (input.value = ""));
    calcGrades();
    scoreInputs[0]?.focus();
  });

  let initRows = [
    { weight: "10", score: "" },
    { weight: "20", score: "" },
    { weight: "70", score: "" },
  ];

  try {
    const sessionData = await chrome.storage?.session?.get([CALC_SESSION_KEY]);
    if (sessionData?.[CALC_SESSION_KEY]?.length) {
      initRows = sessionData[CALC_SESSION_KEY];
    }
  } catch {}

  renderRows(initRows);
  calcGrades();
};
