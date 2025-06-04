const themedQuizData = [{
		question: "반려동물 유실, 유기 방지를 위해 시행하는 동물등록제에 관해 옳지 않은 것을 고르시오.",
		options: [
			"동물등록을 하지 않을 경우 과태료가 부과된다.", "고양이의 동물등록은 선택사항이다.", "최초 동물등록 시에는 반려견과 함께 갈 필요 없다.", "동물 병원 등에서 등록 가능하다."
		],
		answer: 2,
		explanation: "동물 최초 등록시에는 동물에게 무선식별장치를 장착하기 위해 반드시 등록대상동물과 동반하여야 한다."
	},
	{
		question: "소유자를 알 수 없는 동물을 신고하지 않고 매매하거나 매매 목적으로 포획하는 경우 법에 저촉된다.",
		options: ["참", "거짓"],
		answer: 0,
		explanation: "이 경우 2년 이하의 징역이나 2천만원 이하의 벌금이 부과된다."
	},
	{
		question: "주인 없이 떠도는 동물을 발견한 경우 동물보호소나 관할 시군구청에 신고하면 된다.",
		options: ["참", "거짓"],
		answer: 0,
		explanation: ""
	},
	{
		question: "각 지역 보호소에 입소한 유기견들은 보호기간이 지나면 해당 지자체로 소유권이 귀속되고, 대부분 안락사 대상이 된다. 보호기간은 얼마일까?",
		options: ["1-2일", "5-7일", "14일", "30일"],
		answer: 1,
		explanation: "보호 기간은 지역마다 다르지만, 며칠 동안의 기간은 주인이 잃어버린 반려동물을 찾을 시간을 준다."
	}
];

let currentQuestionIndex = 0;
let score = 0;
let quizContainerElement;
let questionNumberDisplayElement;
let totalQuestionsDisplayElement;
let questionTextDisplayElement;
let optionsDisplayElement;
let resultDisplayElement;
let nextQuestionBtnElement;
let quizFinalScoreContainerElement;
let userScoreDisplayElement;
let totalScoreDisplayElement;
let restartQuizBtnElement;

function loadQuizQuestion() {
	if (!themedQuizData || themedQuizData.length === 0 || !questionTextDisplayElement) return;
	const currentQData = themedQuizData[currentQuestionIndex];
	if (questionNumberDisplayElement) questionNumberDisplayElement.textContent = currentQuestionIndex + 1;
	if (totalQuestionsDisplayElement) totalQuestionsDisplayElement.textContent = themedQuizData.length;
	questionTextDisplayElement.textContent = currentQData.question;
	if (optionsDisplayElement) {
		optionsDisplayElement.innerHTML = '';
		currentQData.options.forEach((option, index) => {
			const btn = document.createElement("button");
			btn.className = "quiz-option-btn";
			btn.textContent = option;
			btn.onclick = () => handleQuizAnswer(index, btn);
			optionsDisplayElement.appendChild(btn);
		});
	}
	if (resultDisplayElement) {
		resultDisplayElement.textContent = '';
		resultDisplayElement.className = 'quiz-result';
	}
	if (nextQuestionBtnElement) nextQuestionBtnElement.style.display = "none";
}

function handleQuizAnswer(selectedIndex, clickedButton) {
	const currentQData = themedQuizData[currentQuestionIndex];
	const correctAnswerIndex = currentQData.answer;
	const optionButtons = optionsDisplayElement.querySelectorAll(".quiz-option-btn");
	optionButtons.forEach((btn, index) => {
		btn.disabled = true;
		if (index === correctAnswerIndex) {
			btn.classList.add("correct");
		}
	});
	if (selectedIndex === correctAnswerIndex) {
		score++;
		if (resultDisplayElement) {
			resultDisplayElement.textContent = "Correct! " + (currentQData.explanation || "");
			resultDisplayElement.className = 'quiz-result correct-ans';
		}
	} else {
		if (resultDisplayElement) {
			resultDisplayElement.textContent = `Incorrect. The correct answer was: "${currentQData.options[correctAnswerIndex]}". ${currentQData.explanation || ""}`;
			resultDisplayElement.className = 'quiz-result incorrect-ans';
		}
		if (clickedButton) clickedButton.classList.add("incorrect");
	}
	if (nextQuestionBtnElement) nextQuestionBtnElement.style.display = "inline-block";
}

function loadNextQuestion() {
	currentQuestionIndex++;
	if (currentQuestionIndex < themedQuizData.length) {
		loadQuizQuestion();
	} else {
		showFinalScore();
	}
}

function showFinalScore() {
	if (quizContainerElement) quizContainerElement.style.display = "none";
	if (quizFinalScoreContainerElement) quizFinalScoreContainerElement.style.display = "block";
	if (userScoreDisplayElement) userScoreDisplayElement.textContent = score;
	if (totalScoreDisplayElement) totalScoreDisplayElement.textContent = themedQuizData.length;
}

export function initQuiz() {
	quizContainerElement = document.querySelector('#petQuizContent .quiz-container');
	questionNumberDisplayElement = document.getElementById('question-number-display');
	totalQuestionsDisplayElement = document.getElementById('total-questions-display');
	questionTextDisplayElement = document.getElementById('question-text-display');
	optionsDisplayElement = document.getElementById('options-display');
	resultDisplayElement = document.getElementById('result-display');
	nextQuestionBtnElement = document.getElementById('next-question-btn');
	quizFinalScoreContainerElement = document.getElementById('quiz-final-score');
	userScoreDisplayElement = document.getElementById('user-score');
	totalScoreDisplayElement = document.getElementById('total-score');
	restartQuizBtnElement = document.getElementById('restart-quiz-btn');
	if (!quizContainerElement || !nextQuestionBtnElement || !restartQuizBtnElement) {
		console.error("Quiz DOM elements not found. Quiz cannot initialize.");
		return;
	}
	currentQuestionIndex = 0;
	score = 0;
	quizContainerElement.style.display = "block";
	quizFinalScoreContainerElement.style.display = "none";
	nextQuestionBtnElement.style.display = "none";
	nextQuestionBtnElement.removeEventListener('click', loadNextQuestion);
	nextQuestionBtnElement.addEventListener('click', loadNextQuestion);
	restartQuizBtnElement.removeEventListener('click', initQuiz);
	restartQuizBtnElement.addEventListener('click', initQuiz);
	loadQuizQuestion();
}