// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 30,
    height: 30,
    speed: 5,
    health: 100,
    maxHealth: 100
};

let enemies = [];
let playerBullets = [];
let enemyBullets = [];
let particles = [];
let score = 0;
let wave = 1;
let gameOver = false;
let keys = {};
let difficulty = 'hard'; // 'easy' or 'hard'
let lastShootTime = 0;
let backgroundOffset = 0;
let screenShake = 0;

// Enemy patterns
const ENEMY_PATTERNS = {
    STRAIGHT: 'straight',
    ZIGZAG: 'zigzag',
    DIVE: 'dive'
};

// DOM elements
const scoreElement = document.getElementById('score');
const waveElement = document.getElementById('wave');
const healthFillElement = document.getElementById('health-fill');
const gameOverDiv = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const mobileShootBtn = document.getElementById('mobile-shoot');

// Difficulty selector
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (gameOver) return;
        
        difficulty = btn.dataset.difficulty;
        difficultyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Reset game with new difficulty
        restartGame();
    });
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    if (e.key === ' ' && difficulty === 'hard') {
        shootPlayerBullet();
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Mobile shoot button
mobileShootBtn.addEventListener('click', () => {
    if (difficulty === 'hard') {
        shootPlayerBullet();
    }
});

// Touch controls for mobile
let touchStartX = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
}, {passive: true});

canvas.addEventListener('touchmove', (e) => {
    const touchX = e.touches[0].clientX;
    const rect = canvas.getBoundingClientRect();
    player.x = touchX - rect.left;
    
    // Keep player in bounds
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
}, {passive: true});

// Restart button
restartBtn.addEventListener('click', restartGame);

// Player movement
function updatePlayer() {
    if (keys['ArrowLeft']) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight']) {
        player.x += player.speed;
    }
    
    // Keep player in bounds
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
}

// Shooting
function shootPlayerBullet() {
    if (gameOver) return;
    
    const now = Date.now();
    if (now - lastShootTime < 200) return; // Rate limit
    
    lastShootTime = now;
    
    playerBullets.push({
        x: player.x,
        y: player.y - player.height / 2,
        width: 4,
        height: 12,
        speed: 8,
        color: '#00FF00'
    });
}

// Auto-shoot for easy mode
function autoShoot() {
    if (difficulty === 'easy') {
        const now = Date.now();
        if (now - lastShootTime > 500) {
            shootPlayerBullet();
        }
    }
}

// Spawn enemies
function spawnWave() {
    const enemiesPerWave = 3 + wave * 2;
    const patterns = Object.values(ENEMY_PATTERNS);
    
    for (let i = 0; i < enemiesPerWave; i++) {
        setTimeout(() => {
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            enemies.push({
                x: Math.random() * (canvas.width - 40) + 20,
                y: -30,
                width: 30,
                height: 30,
                speed: 1 + wave * 0.3,
                health: wave,
                pattern: pattern,
                shootTimer: Math.random() * 2000,
                angle: 0
            });
        }, i * 1000);
    }
}

// Enemy AI movement
function updateEnemies() {
    enemies.forEach((enemy, index) => {
        enemy.angle += 0.05;
        
        switch(enemy.pattern) {
            case ENEMY_PATTERNS.STRAIGHT:
                enemy.y += enemy.speed;
                break;
                
            case ENEMY_PATTERNS.ZIGZAG:
                enemy.y += enemy.speed;
                enemy.x += Math.sin(enemy.y * 0.05) * 2;
                break;
                
            case ENEMY_PATTERNS.DIVE:
                // Dive towards player
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    enemy.x += (dx / distance) * enemy.speed * 0.5;
                    enemy.y += (dy / distance) * enemy.speed;
                }
                break;
        }
        
        // Keep in bounds
        enemy.x = Math.max(15, Math.min(canvas.width - 15, enemy.x));
        
        // Enemy shooting
        enemy.shootTimer -= 16;
        if (enemy.shootTimer <= 0 && enemy.y > 0 && enemy.y < canvas.height - 100) {
            shootEnemyBullet(enemy);
            enemy.shootTimer = 1500 + Math.random() * 1000;
        }
        
        // Remove if off screen
        if (enemy.y > canvas.height + 50) {
            enemies.splice(index, 1);
        }
    });
}

// Enemy shooting (predictive)
function shootEnemyBullet(enemy) {
    // Predict player position
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        const bulletSpeed = 4;
        const vx = (dx / distance) * bulletSpeed;
        const vy = (dy / distance) * bulletSpeed;
        
        enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            vx: vx,
            vy: vy,
            width: 4,
            height: 8,
            color: '#FF00FF'
        });
    }
}

// Update bullets
function updateBullets() {
    // Player bullets
    playerBullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        
        // Remove if off screen
        if (bullet.y < -20) {
            playerBullets.splice(index, 1);
        }
    });
    
    // Enemy bullets
    enemyBullets.forEach((bullet, index) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // Remove if off screen
        if (bullet.y > canvas.height + 20 || bullet.x < -20 || bullet.x > canvas.width + 20) {
            enemyBullets.splice(index, 1);
        }
    });
}

// Collision detection
function checkCollisions() {
    // Player bullets vs enemies
    playerBullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (checkBoxCollision(bullet, enemy)) {
                // Hit enemy
                enemy.health--;
                playerBullets.splice(bIndex, 1);
                
                if (enemy.health <= 0) {
                    score += 10;
                    scoreElement.textContent = `Skor: ${score}`;
                    createExplosion(enemy.x, enemy.y, '#FF00FF');
                    enemies.splice(eIndex, 1);
                }
            }
        });
    });
    
    // Enemy bullets vs player
    enemyBullets.forEach((bullet, index) => {
        if (checkBoxCollision(bullet, player)) {
            player.health -= 20;
            updateHealthBar();
            enemyBullets.splice(index, 1);
            screenShake = 10;
            createExplosion(player.x, player.y, '#00FF00');
            
            if (player.health <= 0) {
                endGame();
            }
        }
    });
    
    // Enemies vs player
    enemies.forEach((enemy, index) => {
        if (checkBoxCollision(enemy, player)) {
            player.health -= 30;
            updateHealthBar();
            enemies.splice(index, 1);
            screenShake = 15;
            createExplosion(player.x, player.y, '#FF0000');
            
            if (player.health <= 0) {
                endGame();
            }
        }
    });
}

function checkBoxCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width / 2 &&
           obj1.x + obj1.width > obj2.x - obj2.width / 2 &&
           obj1.y < obj2.y + obj2.height / 2 &&
           obj1.y + obj1.height > obj2.y - obj2.height / 2;
}

// Particle system
function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 4 + 2,
            color: color,
            life: 1
        });
    }
}

function updateParticles() {
    particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;
        
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
}

// Update health bar
function updateHealthBar() {
    const percentage = (player.health / player.maxHealth) * 100;
    healthFillElement.style.width = `${percentage}%`;
    
    if (percentage < 30) {
        healthFillElement.classList.add('low');
    } else {
        healthFillElement.classList.remove('low');
    }
}

// Draw functions
function drawBackground() {
    // Scrolling stars
    backgroundOffset += 0.5;
    if (backgroundOffset > 20) backgroundOffset = 0;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 50; i++) {
        const x = (i * 73) % canvas.width;
        const y = ((i * 97) + backgroundOffset) % canvas.height;
        ctx.fillRect(x, y, 2, 2);
    }
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // Player ship (triangle)
    ctx.fillStyle = '#00FF00';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00FF00';
    
    ctx.beginPath();
    ctx.moveTo(0, -player.height / 2);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(Math.PI);
        
        // Enemy ship (inverted triangle)
        ctx.fillStyle = '#FF00FF';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FF00FF';
        
        ctx.beginPath();
        ctx.moveTo(0, -enemy.height / 2);
        ctx.lineTo(-enemy.width / 2, enemy.height / 2);
        ctx.lineTo(enemy.width / 2, enemy.height / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.restore();
    });
}

function drawBullets() {
    // Player bullets
    playerBullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = bullet.color;
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
        ctx.shadowBlur = 0;
    });
    
    // Enemy bullets
    enemyBullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = bullet.color;
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
        ctx.shadowBlur = 0;
    });
}

function drawParticles() {
    particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        ctx.globalAlpha = 1;
    });
}

// Game loop
function gameLoop() {
    if (gameOver) return;
    
    // Screen shake
    if (screenShake > 0) {
        ctx.save();
        ctx.translate(
            Math.random() * screenShake - screenShake / 2,
            Math.random() * screenShake - screenShake / 2
        );
        screenShake--;
    }
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    
    updatePlayer();
    autoShoot();
    updateEnemies();
    updateBullets();
    updateParticles();
    checkCollisions();
    
    drawPlayer();
    drawEnemies();
    drawBullets();
    drawParticles();
    
    if (screenShake > 0) {
        ctx.restore();
    }
    
    // Check wave completion
    if (enemies.length === 0) {
        wave++;
        waveElement.textContent = `Wave: ${wave}`;
        spawnWave();
    }
    
    requestAnimationFrame(gameLoop);
}

// End game
function endGame() {
    gameOver = true;
    finalScoreElement.textContent = `Skor Akhir: ${score} | Wave: ${wave}`;
    gameOverDiv.classList.remove('hidden');
}

// Restart game
function restartGame() {
    player = {
        x: canvas.width / 2,
        y: canvas.height - 80,
        width: 30,
        height: 30,
        speed: 5,
        health: 100,
        maxHealth: 100
    };
    
    enemies = [];
    playerBullets = [];
    enemyBullets = [];
    particles = [];
    score = 0;
    wave = 1;
    gameOver = false;
    keys = {};
    lastShootTime = 0;
    screenShake = 0;
    
    scoreElement.textContent = 'Skor: 0';
    waveElement.textContent = 'Wave: 1';
    updateHealthBar();
    gameOverDiv.classList.add('hidden');
    
    spawnWave();
    gameLoop();
}

// Start game
spawnWave();
gameLoop();
