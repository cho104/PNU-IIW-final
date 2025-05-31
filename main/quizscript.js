let score = 0; //총점 계산산

const quizData = [
  {
    question: "반려동물 유실, 유기 방지를 위해 시행하는 동물등록제에 관해 옳지 않은 것을 고르세요.",
    options: ["동물등록을 하지 않을 경우 과태료가 부과된다.", "고양이의 동물등록은 선택사항이다.","최초 동물등록 시에는 반려견과 함께 갈 필요 없다.","동물 병원 등에서 등록 가능하다."],
    answer: 2,
  },
  {
    question: "소유자를 알 수 없는 동물을 신고하지 않고 매매하거나 매매 목적으로 포획하는 경우 2년 이하의 징역이나 2천만원 이하의 벌금이 부과된다.",
    options: ["O", "X"],
    answer: 0,
  },
  {
    question: "주인 없이 떠도는 동물을 발견한 경우 동물보호소나 관할 시군구청에 신고하면 된다.",
    options: ["O", "X"],
    answer: 0,
  },
  {
    question: "각 지역 보호소에 입소한 유기견들은 보호기간이 지나면 해당 지자체로 소유권이 귀속되고, 대부분 안락사 대상이 됩니다. 보호기간은 얼마일까요?",
    options: ["7일", "10일", "14일", "30일"],
    answer: 1,
  }
];

let currentQuestion = 0;

function loadQuestion() {
  const q = quizData[currentQuestion];
  document.getElementById("question-number").textContent = `${currentQuestion + 1}/${quizData.length}`;
  document.getElementById("question-text").textContent = q.question;

  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = '';

  q.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = option;
    btn.onclick = () => handleAnswer(index);
    optionsDiv.appendChild(btn);
  });

  document.getElementById("result").textContent = '';
  document.getElementById("next-btn").style.display = "none";
}

function handleAnswer(selectedIndex) {
  const correct = quizData[currentQuestion].answer;
  const result = document.getElementById("result");

  if (selectedIndex === correct) {
    result.textContent = "정답이에요!";
    result.style.color = "green";
    score++; 
  } else {
    result.textContent = "아쉬워요! 정답은 '" + quizData[currentQuestion].options[correct] + "' 이에요.";
    result.style.color = "red";
  }

  // 버튼 비활성화
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach(btn => btn.disabled = true);

  document.getElementById("next-btn").style.display = "inline-block";
}

function shownFinalScore() {
  document.querySelector(".quiz-container").innerHTML = `
    <h2>퀴즈 완료!</h2>
    <p>당신의 점수는 ${score}/${quizData.length} 점 입니다.</p>
    `;
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion < quizData.length) {
    loadQuestion();
  } else {
    shownFinalScore();  }
}

window.onload = loadQuestion;