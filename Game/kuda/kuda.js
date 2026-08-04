// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
const TRACK_HEIGHT = 80;
const FINISH_LINE = 700;
const HORSE_SIZE = 40;
const NUM_HORSES = 4;

let horses = [];
let playerClicks = 0;
let gameStarted = false;
let gameOver = false;
let startTime = 0;
let animationId = null;
let difficulty = 'medium'; // easy, medium, hard

// Difficulty settings
const DIFFICULTY_SETTINGS = {
    easy: { minSpeed: 1, maxSpeed: 3, boostChance: 0.05, boostAmount: 5 },
    medium: { minSpeed: 2, maxSpeed: 6, boostChance: 0.1, boostAmount: 10 },
    hard: { minSpeed: 4, maxSpeed: 8, boostChance: 0.15, boostAmount: 15 }
};

// DOM elements
const clicksElement = document.getElementById('clicks');
const positionElement = document.getElementById('position');
const timerElement = document.getElementById('timer');
const instructionElement = document.getElementById('instruction');
const gameOverDiv = document.getElementById('game-over');
const resultTitleElement = document.getElementById('result-title');
const finalStatsElement = document.getElementById('final-stats');
const restartBtn = document.getElementById('restart-btn');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');

// Difficulty selector
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (gameStarted) return; // Can't change during race
        
        difficulty = btn.dataset.difficulty;
        difficultyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Initialize horses
function initHorses() {
    horses = [];
    for (let i = 0; i < NUM_HORSES; i++) {
        horses.push({
            lane: i,
            position: 50,
            speed: 0,
            color: i === 0 ? '#00FF00' : '#FF00FF',
            isPlayer: i === 0,
            name: i === 0 ? 'ANDA' : `AI ${i}`
        });
    }
}

// Click/Touch handler
function handleClick() {
    if (gameOver) return;
    
    if (!gameStarted) {
        gameStarted = true;
        startTime = Date.now();
        animate();
    }
    
    playerClicks++;
    horses[0].position += 5; // Player moves 5px per click
    clicksElement.textContent = `Klik: ${playerClicks}`;
}

canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleClick();
}, {passive: false});

// Restart button
restartBtn.addEventListener('click', restartGame);

// Draw functions
function drawTrack() {
    // Background
    ctx.fillStyle = '#1a472a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Lanes
    for (let i = 0; i <= NUM_HORSES; i++) {
        ctx.strokeStyle = i === 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = i === 0 || i === NUM_HORSES ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(0, i * TRACK_HEIGHT);
        ctx.lineTo(canvas.width, i * TRACK_HEIGHT);
        ctx.stroke();
    }
    
    // Starting line
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(40, canvas.height);
    ctx.stroke();
    
    // Finish line (checkered pattern)
    const checkerSize = 20;
    for (let y = 0; y < canvas.height; y += checkerSize) {
        for (let x = 0; x < checkerSize; x += checkerSize) {
            const isWhite = ((y + x) / checkerSize) % 2 === 0;
            ctx.fillStyle = isWhite ? '#FFFFFF' : '#000000';
            ctx.fillRect(FINISH_LINE, y + x, checkerSize, checkerSize);
        }
    }
    
    // Distance markers
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px Arial';
    for (let i = 100; i < FINISH_LINE; i += 100) {
        ctx.fillText(`${i}m`, i, 15);
    }
}

function drawHorse(horse) {
    const x = horse.position;
    const y = horse.lane * TRACK_HEIGHT + TRACK_HEIGHT / 2;
    
    // Horse body (simple representation)
    ctx.save();
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + 5, y + 20, HORSE_SIZE, 10);
    
    // Body glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = horse.color;
    
    // Body
    ctx.fillStyle = horse.color;
    ctx.fillRect(x, y - 10, HORSE_SIZE, 20);
    
    // Head
    ctx.beginPath();
    ctx.arc(x + HORSE_SIZE, y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs (animated)
    const legOffset = Math.sin(Date.now() / 100 + horse.lane) * 5;
    ctx.fillRect(x + 10, y + 10, 5, 10 + legOffset);
    ctx.fillRect(x + 25, y + 10, 5, 10 - legOffset);
    
    ctx.shadowBlur = 0;
    ctx.restore();
    
    // Name label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(horse.name, x, y - 25);
    
    // Position indicator for player
    if (horse.isPlayer) {
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 5, y - 25, HORSE_SIZE + 10, 50);
    }
}

function drawConfetti() {
    const confettiCount = 50;
    for (let i = 0; i < confettiCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 5 + 2;
        const hue = Math.random() * 360;
        
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(x, y, size, size);
    }
}

// Update AI horses
function updateAI() {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    
    for (let i = 1; i < horses.length; i++) {
        const horse = horses[i];
        
        // Base speed with random variation based on difficulty
        const baseSpeed = settings.minSpeed + Math.random() * (settings.maxSpeed - settings.minSpeed);
        horse.position += baseSpeed;
        
        // Random boost (chance based on difficulty)
        if (Math.random() < settings.boostChance) {
            horse.position += settings.boostAmount;
        }
        
        // Random slow down (5% chance - same for all difficulties)
        if (Math.random() < 0.05) {
            horse.position -= 5;
        }
    }
}

// Calculate position
function calculatePosition() {
    const sortedHorses = [...horses].sort((a, b) => b.position - a.position);
    const playerPosition = sortedHorses.findIndex(h => h.isPlayer) + 1;
    positionElement.textContent = `Posisi: ${playerPosition}/${NUM_HORSES}`;
    return playerPosition;
}

// Check winner
function checkWinner() {
    for (let horse of horses) {
        if (horse.position >= FINISH_LINE) {
            endGame(horse.isPlayer);
            return true;
        }
    }
    return false;
}

// Update timer
function updateTimer() {
    if (gameStarted && !gameOver) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        timerElement.textContent = `Waktu: ${elapsed}s`;
    }
}

// Animation loop
function animate() {
    if (gameOver) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawTrack();
    
    if (gameStarted) {
        updateAI();
        updateTimer();
        calculatePosition();
        
        if (checkWinner()) {
            return;
        }
    }
    
    horses.forEach(horse => drawHorse(horse));
    
    animationId = requestAnimationFrame(animate);
}

// End game
function endGame(playerWon) {
    gameOver = true;
    cancelAnimationFrame(animationId);
    
    const finalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const finalPosition = calculatePosition();
    
    instructionElement.classList.add('hidden');
    gameOverDiv.classList.remove('hidden');
    
    if (playerWon) {
        gameOverDiv.classList.add('win');
        gameOverDiv.classList.remove('lose');
        resultTitleElement.textContent = '🏆 JUARA! 🏆';
        
        // Draw confetti
        const confettiInterval = setInterval(() => {
            drawConfetti();
        }, 100);
        
        setTimeout(() => clearInterval(confettiInterval), 3000);
    } else {
        gameOverDiv.classList.add('lose');
        gameOverDiv.classList.remove('win');
        resultTitleElement.textContent = '😔 KALAH 😔';
    }
    
    finalStatsElement.innerHTML = `
        Posisi Akhir: ${finalPosition}/${NUM_HORSES}<br>
        Total Klik: ${playerClicks}<br>
        Waktu: ${finalTime}s<br>
        Jarak: ${Math.round(horses[0].position)}m
    `;
}

// Restart game
function restartGame() {
    gameOver = false;
    gameStarted = false;
    playerClicks = 0;
    startTime = 0;
    
    clicksElement.textContent = 'Klik: 0';
    positionElement.textContent = 'Posisi: 4/4';
    timerElement.textContent = 'Waktu: 0.0s';
    
    instructionElement.classList.remove('hidden');
    gameOverDiv.classList.add('hidden');
    
    initHorses();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTrack();
    horses.forEach(horse => drawHorse(horse));
}

// Initialize game
initHorses();
drawTrack();
horses.forEach(horse => drawHorse(horse));
