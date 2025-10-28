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
const correctSound = new Audio('assets/correct.mp3');
const incorrectSound = new Audio('assets/incorrect.mp3');
const bgmSound = new Audio('assets/bgm.mp3');

bgmSound.loop = true;
bgmSound.volume = 0.3;

let questions = [];
let currentQuestionIndex = 0;
let score = 0;

const TOTAL_QUESTIONS = 20; 

const API_URL = 'soal.json';

// Soal
async function startGame() {
    currentQuestionIndex = 0;
    score = 0;
    questions = [];

    loadingContainer.classList.remove('hidden');
    quizContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');

    bgmSound.play().catch(error => console.log("Menunggu interaksi pengguna untuk memutar BGM..."));
    
    try {
        const response = await fetch(API_URL);
        const allQuestions = await response.json();
        
        const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5); // Ngacak soal
        
        questions = shuffledQuestions.slice(0, TOTAL_QUESTIONS);
        
        loadingContainer.classList.add('hidden');
        quizContainer.classList.remove('hidden');

        displayQuestion();
    } catch (error) {
        loadingContainer.innerText = 'Gagal memuat soal. Pastikan file "soal.json" ada dan jalankan dengan "Live Server".';
        console.error('Gagal mengambil data kuis:', error);
    }
}

// Display soal
function displayQuestion() {

    resetState(); 
    
    const currentQuestion = questions[currentQuestionIndex];
    
    questionText.innerHTML = currentQuestion.question; 
    
    questionCounterText.innerText = `Soal ${currentQuestionIndex + 1} dari ${TOTAL_QUESTIONS}`;
    scoreText.innerText = `Skor: ${score}`;

    const allAnswers = [...currentQuestion.incorrect_answers, currentQuestion.correct_answer];
    
    const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);

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

function selectAnswer(e) {
    const selectedButton = e.target;
    const isCorrect = selectedButton.dataset.correct === 'true';

    if (isCorrect) {
        score++;
        selectedButton.classList.add('correct'); // Nek bener Ijo
        correctSound.play();
        
    } else {
        selectedButton.classList.add('incorrect'); // Nek salah abang
        incorrectSound.play();
    }

    Array.from(answerButtonsElement.children).forEach(button => {
        if (button.dataset.correct === 'true') {
            button.classList.add('correct');
        }
        button.disabled = true;
    });

    nextButton.classList.remove('hidden');
}

function resetState() {
    nextButton.classList.add('hidden');
    while (answerButtonsElement.firstChild) {
        answerButtonsElement.removeChild(answerButtonsElement.firstChild);
    }
}

function handleNextButton() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        displayQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    quizContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    
    resultText.innerText = `Skor Akhir Anda: ${score} / ${TOTAL_QUESTIONS}`;

    bgmSound.pause(); 
    bgmSound.currentTime = 0;
}

nextButton.addEventListener('click', handleNextButton);
playAgainButton.addEventListener('click', startGame);
startGame();

