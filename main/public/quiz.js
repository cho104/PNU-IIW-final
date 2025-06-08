let currentQuestionIndex = 0;
let score = 0;
let quizDataFromServer = [];
let quizContainerElement, questionNumberDisplayElement, totalQuestionsDisplayElement, questionTextDisplayElement;
let resultDisplayElement, nextQuestionBtnElement, quizFinalScoreContainerElement, userScoreDisplayElement;
let totalScoreDisplayElement, restartQuizBtnElement, petQuizContentElement, optionsDisplayElement;

async function fetchQuiz() {
    try {
        const response = await fetch('/api/content/quiz');
        if (!response.ok) {
            throw new Error(`Failed to fetch quiz data: ${response.statusText}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            quizDataFromServer = data;
            return true;
        } else {
            console.error("Quiz data from server is not an array:", data);
            quizDataFromServer = [];
            return false;
        }
    } catch (error) {
        console.error("Error fetching quiz questions:", error);
        if (petQuizContentElement) {
             petQuizContentElement.innerHTML = `<p style="color:red; text-align:center; padding:20px;">Could not load quiz questions. Please try again later.</p>`;
        }
        quizDataFromServer = [];
        return false;
    }
}

function loadQuiz() {
    if (!quizDataFromServer || quizDataFromServer.length === 0) {
        console.warn("No quiz data available to load question.");
        if (quizContainerElement) quizContainerElement.style.display = "none";
        if (petQuizContentElement && !petQuizContentElement.querySelector('.quiz-error')) {
            const errorMsg = document.createElement('p');
            errorMsg.textContent = "No quiz questions loaded. Try refreshing or contact support.";
            errorMsg.style.textAlign = "center";
            errorMsg.style.padding = "20px";
            errorMsg.className = 'quiz-error';
            petQuizContentElement.appendChild(errorMsg);
        }
        return;
    }
    if (currentQuestionIndex >= quizDataFromServer.length) {
        showFinalScore();
        return;
    }
    const currentQData = quizDataFromServer[currentQuestionIndex];
    if (questionNumberDisplayElement) questionNumberDisplayElement.textContent = currentQuestionIndex + 1;
    if (totalQuestionsDisplayElement) totalQuestionsDisplayElement.textContent = quizDataFromServer.length;
    questionTextDisplayElement.textContent = currentQData.question;
    if (optionsDisplayElement) {
        optionsDisplayElement.innerHTML = '';
        currentQData.options.forEach((option, index) => {
            const btn = document.createElement("button");
            btn.className = "quiz-option-btn";
            btn.textContent = option;
            btn.onclick = () => handleAnswer(index, currentQData.answer, btn);
            optionsDisplayElement.appendChild(btn);
        });
    }
    if (resultDisplayElement) {
        resultDisplayElement.textContent = '';
        resultDisplayElement.className = 'quiz-result';
    }
    if (nextQuestionBtnElement) nextQuestionBtnElement.style.display = "none";
}

function handleAnswer(selectedIndex, correctAnswerIndex, clickedButton) {
    if (!optionsDisplayElement || !resultDisplayElement || !nextQuestionBtnElement) {
        console.error("Quiz answer handling DOM elements not found.");
        return;
    }
    if (!quizDataFromServer || quizDataFromServer.length === 0) return;
    const currentQData = quizDataFromServer[currentQuestionIndex];
    const optionButtons = optionsDisplayElement.querySelectorAll(".quiz-option-btn");
    optionButtons.forEach((btn, index) => {
        btn.disabled = true;
        if (index === correctAnswerIndex) { btn.classList.add("correct"); }
    });
    if (selectedIndex === correctAnswerIndex) {
        score++;
        resultDisplayElement.textContent = "Correct! " + (currentQData.explanation || "");
        resultDisplayElement.className = 'quiz-result correct-ans';
    } else {
        resultDisplayElement.textContent = `Incorrect. The correct answer was: "${currentQData.options[correctAnswerIndex]}". ${currentQData.explanation || ""}`;
        resultDisplayElement.className = 'quiz-result incorrect-ans';
        if (clickedButton) clickedButton.classList.add("incorrect");
    }
    nextQuestionBtnElement.style.display = "inline-block";
}

function loadNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizDataFromServer.length) { loadQuiz(); }
	else { showFinalScore(); }
}

function showFinalScore() {
    if (quizContainerElement) quizContainerElement.style.display = "none";
    if (quizFinalScoreContainerElement) quizFinalScoreContainerElement.style.display = "block";
    if (userScoreDisplayElement) userScoreDisplayElement.textContent = score;
    if (totalScoreDisplayElement && quizDataFromServer) totalScoreDisplayElement.textContent = quizDataFromServer.length;
}

export async function initQuiz() {
    petQuizContentElement = document.getElementById('petQuizContent');
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
    if (!petQuizContentElement || !quizContainerElement || !nextQuestionBtnElement || !restartQuizBtnElement) {
        console.error("Essential Quiz DOM elements not found. Quiz cannot initialize properly.");
        if(petQuizContentElement) petQuizContentElement.innerHTML = `<p style="color:red; text-align:center; padding:20px;">Quiz UI elements missing. Cannot start quiz.</p>`;
        return;
    }
    const existingError = petQuizContentElement.querySelector('.quiz-error');
    if (existingError) existingError.remove();
    const dataLoaded = await fetchQuiz();
    if (!dataLoaded || quizDataFromServer.length === 0) {
        console.error("Failed to load quiz data from server or data is empty.");
        if(quizContainerElement) quizContainerElement.style.display = "none";
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
    loadQuiz();
}