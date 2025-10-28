const loadingContainer = document.getElementById('loading');
const quizContainer = document.getElementById('quiz-content');
const resultContainer = document.getElementById('result-container');
const questionText = document.getElementById('question-text');
const answerButtonsElement = document.getElementById('answer-buttons');
const nextButton = document.getElementById('next-btn');
const playAgainButton = document.getElementById('play-again-btn');
const scoreText = document.getElementById('score-text');
const questionCounterText = document.getElementById('question-counter');
const resultText = document.getElementById('result-text');

// Var Soal
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
const TOTAL_QUESTIONS = 20; // Jumlah Soal

const API_URL = `soal.json`;

// Gacha Soal
async function startGame() {
    currentQuestionIndex = 0;
    score = 0;
    questions = [];

    loadingContainer.classList.remove('hidden');
    quizContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');

    try {
            const response = await fetch(API_URL);
            const allQuestions = await response.json();
            
            const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);
            
            questions = shuffledQuestions.slice(0, TOTAL_QUESTIONS);
            
            loadingContainer.classList.add('hidden');
            quizContainer.classList.remove('hidden');

            displayQuestion();
        } catch (error) {
            loadingContainer.innerText = 'Gagal memuat soal. Pastikan file "soal.json" ada.';
            console.error('Gagal mengambil data kuis:', error);
        }
}

// Tampilin Soal
function displayQuestion() {
    resetState(); 
    
    const currentQuestion = questions[currentQuestionIndex];
    
    questionText.innerHTML = currentQuestion.question;
    
    questionCounterText.innerText = `Soal ${currentQuestionIndex + 1} dari ${TOTAL_QUESTIONS}`;
    scoreText.innerText = `Skor: ${score}`;

    const allAnswers = [...currentQuestion.incorrect_answers, currentQuestion.correct_answer];
    
    const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.3);

    shuffledAnswers.forEach(answer => {
        const button = document.createElement('button');
        button.innerHTML = answer;
        button.classList.add('btn');
        
        if (answer === currentQuestion.correct_answer) {
            button.dataset.correct = true;
        }
        
        button.addEventListener('click', selectAnswer);
        answerButtonsElement.appendChild(button);
    });
}

// Cek Jawaban
function selectAnswer(e) {
    const selectedButton = e.target;
    const isCorrect = selectedButton.dataset.correct === 'true';
    if (isCorrect) {
        score++;
        selectedButton.classList.add('correct'); // Kondisi bener = Ijo
    } else {
        selectedButton.classList.add('incorrect'); // Kondidisi salah = Abang
    }
    Array.from(answerButtonsElement.children).forEach(button => {
        if (button.dataset.correct === 'true') {
            button.classList.add('correct');
        }
        button.disabled = true;
    });
    nextButton.classList.remove('hidden');
}

// Clear Layar
function resetState() {
    nextButton.classList.add('hidden');
    while (answerButtonsElement.firstChild) {
        answerButtonsElement.removeChild(answerButtonsElement.firstChild);
    }
}

// Pindah Soal
function handleNextButton() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        displayQuestion();
    } else {
        showResults();
    }
}

// Hasil Akhir
function showResults() {
    quizContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    resultText.innerText = `Skor Akhir Anda: ${score} / ${TOTAL_QUESTIONS}`;
}

nextButton.addEventListener('click', handleNextButton);
playAgainButton.addEventListener('click', startGame);

startGame();
