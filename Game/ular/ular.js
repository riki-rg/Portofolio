// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = 400;

let snake = [{x: 10, y: 10}];
let direction = {x: 0, y: 0};
let nextDirection = {x: 0, y: 0};
let food = {x: 15, y: 15};
let score = 0;
let highscore = localStorage.getItem('highscore_ular') || 0;
let gameSpeed = 150;
let gameLoop = null;
let isPaused = false;
let isGameOver = false;

// DOM elements
const scoreElement = document.getElementById('score');
const highscoreElement = document.getElementById('highscore');
const gameOverDiv = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Control buttons
const upBtn = document.getElementById('up-btn');
const downBtn = document.getElementById('down-btn');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');

// Initialize
highscoreElement.textContent = `High: ${highscore}`;

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
    }
    
    if (isPaused || isGameOver) return;
    
    switch(e.key) {
        case 'ArrowUp':
            if (direction.y === 0) {
                nextDirection = {x: 0, y: -1};
            }
            e.preventDefault();
            break;
        case 'ArrowDown':
            if (direction.y === 0) {
                nextDirection = {x: 0, y: 1};
            }
            e.preventDefault();
            break;
        case 'ArrowLeft':
            if (direction.x === 0) {
                nextDirection = {x: -1, y: 0};
            }
            e.preventDefault();
            break;
        case 'ArrowRight':
            if (direction.x === 0) {
                nextDirection = {x: 1, y: 0};
            }
            e.preventDefault();
            break;
    }
});

// Touch controls for mobile (swipe detection)
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, {passive: true});

canvas.addEventListener('touchend', (e) => {
    if (isPaused || isGameOver) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 30 && direction.x === 0) {
            nextDirection = {x: 1, y: 0}; // Right
        } else if (deltaX < -30 && direction.x === 0) {
            nextDirection = {x: -1, y: 0}; // Left
        }
    } else {
        // Vertical swipe
        if (deltaY > 30 && direction.y === 0) {
            nextDirection = {x: 0, y: 1}; // Down
        } else if (deltaY < -30 && direction.y === 0) {
            nextDirection = {x: 0, y: -1}; // Up
        }
    }
}, {passive: true});

// Button controls
upBtn.addEventListener('click', () => {
    if (direction.y === 0 && !isPaused && !isGameOver) {
        nextDirection = {x: 0, y: -1};
    }
});

downBtn.addEventListener('click', () => {
    if (direction.y === 0 && !isPaused && !isGameOver) {
        nextDirection = {x: 0, y: 1};
    }
});

leftBtn.addEventListener('click', () => {
    if (direction.x === 0 && !isPaused && !isGameOver) {
        nextDirection = {x: -1, y: 0};
    }
});

rightBtn.addEventListener('click', () => {
    if (direction.x === 0 && !isPaused && !isGameOver) {
        nextDirection = {x: 1, y: 0};
    }
});

// Restart button
restartBtn.addEventListener('click', restartGame);

// Toggle pause
function togglePause() {
    if (isGameOver) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        clearInterval(gameLoop);
        // Draw pause overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.fillStyle = '#00FFFF';
        ctx.font = 'bold 30px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    } else {
        gameLoop = setInterval(update, gameSpeed);
    }
}

// Generate random food position
function generateFood() {
    let newFood;
    let validPosition = false;
    
    while (!validPosition) {
        newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        
        // Check if food is not on snake
        validPosition = !snake.some(segment => 
            segment.x === newFood.x && segment.y === newFood.y
        );
    }
    
    food = newFood;
}

// Draw functions
function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }
}

function drawSnake() {
    snake.forEach((segment, index) => {
        // Gradient for body
        const gradient = ctx.createRadialGradient(
            segment.x * CELL_SIZE + CELL_SIZE / 2,
            segment.y * CELL_SIZE + CELL_SIZE / 2,
            0,
            segment.x * CELL_SIZE + CELL_SIZE / 2,
            segment.y * CELL_SIZE + CELL_SIZE / 2,
            CELL_SIZE / 2
        );
        
        if (index === 0) {
            // Head - bright green
            gradient.addColorStop(0, '#00FF00');
            gradient.addColorStop(1, '#00AA00');
        } else {
            // Body - darker green
            gradient.addColorStop(0, '#00DD00');
            gradient.addColorStop(1, '#008800');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(
            segment.x * CELL_SIZE + 1,
            segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
        );
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00FF00';
        ctx.fillRect(
            segment.x * CELL_SIZE + 1,
            segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
        );
        ctx.shadowBlur = 0;
    });
}

function drawFood() {
    // Pulsing effect
    const pulse = Math.sin(Date.now() / 200) * 2 + 8;
    
    const gradient = ctx.createRadialGradient(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        0,
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        pulse
    );
    
    gradient.addColorStop(0, '#FF0000');
    gradient.addColorStop(1, '#AA0000');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        pulse,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FF0000';
    ctx.fill();
    ctx.shadowBlur = 0;
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    drawGrid();
    drawFood();
    drawSnake();
}

// Game logic
function update() {
    if (isPaused || isGameOver) return;
    
    // Update direction
    direction = {...nextDirection};
    
    // Don't move if no direction set
    if (direction.x === 0 && direction.y === 0) {
        draw();
        return;
    }
    
    // Calculate new head position
    const head = {...snake[0]};
    head.x += direction.x;
    head.y += direction.y;
    
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        endGame();
        return;
    }
    
    // Check self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        endGame();
        return;
    }
    
    // Add new head
    snake.unshift(head);
    
    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreElement.textContent = `Skor: ${score}`;
        
        // Increase speed every 5 foods
        if (score % 5 === 0 && gameSpeed > 50) {
            gameSpeed -= 10;
            clearInterval(gameLoop);
            gameLoop = setInterval(update, gameSpeed);
        }
        
        generateFood();
    } else {
        // Remove tail if no food eaten
        snake.pop();
    }
    
    draw();
}

function endGame() {
    isGameOver = true;
    clearInterval(gameLoop);
    
    // Update high score
    if (score > highscore) {
        highscore = score;
        localStorage.setItem('highscore_ular', highscore);
        highscoreElement.textContent = `High: ${highscore}`;
        finalScoreElement.textContent = `Skor Akhir: ${score} 🎉 NEW HIGH SCORE!`;
    } else {
        finalScoreElement.textContent = `Skor Akhir: ${score}`;
    }
    
    // Death animation
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    gameOverDiv.classList.remove('hidden');
}

function restartGame() {
    // Reset variables
    snake = [{x: 10, y: 10}];
    direction = {x: 0, y: 0};
    nextDirection = {x: 0, y: 0};
    food = {x: 15, y: 15};
    score = 0;
    gameSpeed = 150;
    isPaused = false;
    isGameOver = false;
    
    // Update UI
    scoreElement.textContent = 'Skor: 0';
    gameOverDiv.classList.add('hidden');
    
    // Restart loop
    clearInterval(gameLoop);
    gameLoop = setInterval(update, gameSpeed);
    
    draw();
}

// Start game
generateFood();
draw();
gameLoop = setInterval(update, gameSpeed);
