const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const BLOCK_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const COLORS = ['cyan', 'blue', 'orange', 'yellow', 'green', 'purple', 'red'];

// Tetromino shapes
const SHAPES = [
    [[1, 1, 1, 1]],                // I
    [[1, 1, 1], [0, 1, 0]],       // T
    [[1, 1, 1], [1, 0, 0]],       // L
    [[1, 1, 1], [0, 0, 1]],       // J
    [[1, 1], [1, 1]],             // O
    [[1, 1, 0], [0, 1, 1]],       // S
    [[0, 1, 1], [1, 1, 0]]        // Z
];

// Add these constants and variables at the top
const INITIAL_SPEED = 1000; // Starting speed (1 second)
const MIN_SPEED = 100; // Maximum speed (100ms)
const BASE_POINTS_FOR_LEVEL = 500; // Base points needed for first level
const MAX_LEVEL = 10; // Maximum level

// Scoring system
const SCORING = {
    1: 100,
    2: 250,
    3: 400,
    4: 550
};

// Game state
let board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
let currentPiece = null;
let currentPieceX = 0;
let currentPieceY = 0;
let currentPieceColor = '';
let score = 0;
let highScore = localStorage.getItem('tetrisHighScore') || 0;
let level = 1;
let lines = 0;
let combo = 0;
let gameSpeed = INITIAL_SPEED;
let pointsNeededForNextLevel = BASE_POINTS_FOR_LEVEL;
let nextPiece = null;
const nextPieceCanvas = document.getElementById('nextPieceCanvas');
const nextPieceCtx = nextPieceCanvas.getContext('2d');

// Add these variables at the top of your tetris.js file
let isGamePaused = false;
let gameInterval;

class Piece {
    constructor(shape, color) {
        this.shape = shape;
        this.color = color;
    }
}

function createNewPiece() {
    if (nextPiece === null) {
        nextPiece = generateRandomPiece();
    }
    currentPiece = nextPiece;
    nextPiece = generateRandomPiece();
    currentPieceX = Math.floor(BOARD_WIDTH / 2) - Math.floor(currentPiece.shape[0].length / 2);
    currentPieceY = 0;
    drawNextPiece();
}

function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw placed pieces
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x]) {
                drawBlock(x, y, board[y][x]);
            }
        }
    }

    // Draw current piece
    if (currentPiece) {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    drawBlock(currentPieceX + x, currentPieceY + y, currentPiece.color);
                }
            }
        }
    }
}

function isValidMove(pieceX, pieceY, piece) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = pieceX + x;
                const newY = pieceY + y;
                if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
                    return false;
                }
                if (newY >= 0 && board[newY][newX]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function placePiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPieceY + y;
                if (boardY >= 0) {
                    board[boardY][currentPieceX + x] = currentPiece.color;
                }
            }
        }
    }
    checkLines();
    createNewPiece();
    if (!isValidMove(currentPieceX, currentPieceY, currentPiece)) {
        // Game Over
        const gameOverMessage = document.createElement('div');
        gameOverMessage.style.position = 'absolute';
        gameOverMessage.style.top = '50%';
        gameOverMessage.style.left = '50%';
        gameOverMessage.style.transform = 'translate(-50%, -50%)';
        gameOverMessage.style.color = 'white';
        gameOverMessage.style.fontSize = '40px';
        gameOverMessage.style.fontWeight = 'bold';
        gameOverMessage.textContent = 'Game Over!';
        document.body.appendChild(gameOverMessage);
        
        setTimeout(() => {
            document.body.removeChild(gameOverMessage);
            board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
            score = 0;
            level = 1;
            combo = 0;
            gameSpeed = INITIAL_SPEED;
            pointsNeededForNextLevel = calculatePointsNeededForLevel(level);
            nextPiece = null;
            createNewPiece();
            updateStats();
        }, 2000);
    }
}

function checkLines() {
    let linesCleared = 0;
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(BOARD_WIDTH).fill(0));
            linesCleared++;
            y++;
        }
    }
    
    if (linesCleared > 0) {
        // Add combo bonus
        const comboMultiplier = Math.min(combo + 1, 5);
        const baseScore = SCORING[linesCleared];
        const comboBonus = Math.floor(baseScore * (comboMultiplier * 0.1));
        const levelMultiplier = 1 + (level - 1) * 0.1; // 10% more points per level
        
        score += Math.floor((baseScore + comboBonus) * levelMultiplier);
        combo++;

        // Update high score
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('tetrisHighScore', highScore);
        }

        checkLevelUp();
    } else {
        combo = 0;
    }
    
    updateStats();
}

function updateStats() {
    document.getElementById('score-display').textContent = `Score: ${score}`;
    document.getElementById('high-score-display').textContent = `High Score: ${highScore}`;
    document.getElementById('level-display').textContent = `Level: ${level} / ${MAX_LEVEL}`;
    document.getElementById('combo-display').textContent = `Combo: x${combo + 1}`;
    document.getElementById('lines-display').textContent = 
        `Points to Next Level: ${Math.max(0, pointsNeededForNextLevel - score)}`;
}

function calculatePointsNeededForLevel(level) {
    return BASE_POINTS_FOR_LEVEL * level;
}

function checkLevelUp() {
    if (score >= pointsNeededForNextLevel) {
        if (level === MAX_LEVEL) {
            showWinMessage();
            return;
        }
        
        level++;
        score = 0;
        pointsNeededForNextLevel = calculatePointsNeededForLevel(level);
        updateGameSpeed();
        
        // Reset the board and pieces
        board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
        nextPiece = null;
        createNewPiece();
        
        // Show level up message
        const levelMessage = document.createElement('div');
        levelMessage.style.position = 'absolute';
        levelMessage.style.top = '50%';
        levelMessage.style.left = '50%';
        levelMessage.style.transform = 'translate(-50%, -50%)';
        levelMessage.style.color = 'white';
        levelMessage.style.fontSize = '40px';
        levelMessage.style.fontWeight = 'bold';
        levelMessage.style.textAlign = 'center';
        levelMessage.innerHTML = `Level ${level}!<br>Points needed: ${pointsNeededForNextLevel}`;
        document.body.appendChild(levelMessage);
        
        setTimeout(() => {
            document.body.removeChild(levelMessage);
        }, 2000);
    }
}

function updateGameSpeed() {
    // Make each level progressively faster
    const speedDecrease = (INITIAL_SPEED - MIN_SPEED) / MAX_LEVEL;
    gameSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - (level - 1) * speedDecrease);
}

function moveDown() {
    if (isValidMove(currentPieceX, currentPieceY + 1, currentPiece)) {
        currentPieceY++;
    } else {
        placePiece();
    }
}

function moveLeft() {
    if (isValidMove(currentPieceX - 1, currentPieceY, currentPiece)) {
        currentPieceX--;
    }
}

function moveRight() {
    if (isValidMove(currentPieceX + 1, currentPieceY, currentPiece)) {
        currentPieceX++;
    }
}

function rotate() {
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[row.length - 1 - i])
    );
    const newPiece = new Piece(rotated, currentPiece.color);
    if (isValidMove(currentPieceX, currentPieceY, newPiece)) {
        currentPiece = newPiece;
    }
}

// Event listeners
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowLeft':
            moveLeft();
            break;
        case 'ArrowRight':
            moveRight();
            break;
        case 'ArrowDown':
            moveDown();
            break;
        case 'ArrowUp':
            rotate();
            break;
    }
    drawBoard();
});

// Game loop
function gameLoop() {
    if (!isGamePaused) {
        moveDown();
        drawBoard();
    }
    gameInterval = setTimeout(gameLoop, gameSpeed);
}

// Initialize stats display
updateStats();

// Initialize game
function initGame() {
    score = 0;
    level = 1;
    combo = 0;
    gameSpeed = INITIAL_SPEED;
    pointsNeededForNextLevel = calculatePointsNeededForLevel(level);
    nextPiece = null;
    updateStats();
    createNewPiece();
    drawBoard();
    gameLoop();
}

// Start game
initGame();

// Add this CSS to create a rainbow animation
const rainbowStyle = document.createElement('style');
rainbowStyle.textContent = `
@keyframes rainbow {
    0% { color: red; }
    16% { color: orange; }
    32% { color: yellow; }
    48% { color: green; }
    64% { color: blue; }
    80% { color: indigo; }
    100% { color: violet; }
}
.rainbow-text {
    animation: rainbow 2s linear infinite;
    font-size: 80px;
    font-weight: bold;
    font-family: 'Arial', sans-serif;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}`;
document.head.appendChild(rainbowStyle);

// Function to show the win message
function showWinMessage() {
    const winMessage = document.createElement('div');
    winMessage.style.position = 'fixed';
    winMessage.style.top = '50%';
    winMessage.style.left = '50%';
    winMessage.style.transform = 'translate(-50%, -50%)';
    winMessage.style.zIndex = '1000';
    winMessage.style.textAlign = 'center';
    winMessage.className = 'rainbow-text';
    winMessage.textContent = 'YOU WIN!';
    
    // Add a semi-transparent background overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.zIndex = '999';
    
    document.body.appendChild(overlay);
    document.body.appendChild(winMessage);
    
    // Add a play again button
    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.style.padding = '15px 30px';
    playAgainBtn.style.fontSize = '24px';
    playAgainBtn.style.marginTop = '30px';
    playAgainBtn.style.cursor = 'pointer';
    playAgainBtn.style.backgroundColor = 'white';
    playAgainBtn.style.border = 'none';
    playAgainBtn.style.borderRadius = '5px';
    
    playAgainBtn.onclick = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(winMessage);
        document.body.removeChild(playAgainBtn);
        initGame();
    };
    
    document.body.appendChild(playAgainBtn);
}

// Add function to generate random piece
function generateRandomPiece() {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    const shape = SHAPES[randomIndex];
    const color = COLORS[randomIndex];
    return new Piece(shape, color);
}

// Add function to draw next piece
function drawNextPiece() {
    // Clear the next piece canvas
    nextPieceCtx.fillStyle = 'black';
    nextPieceCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);

    if (!nextPiece) return;

    const blockSize = 25; // Size of each block in the preview
    const pieceWidth = nextPiece.shape[0].length * blockSize;
    const pieceHeight = nextPiece.shape.length * blockSize;
    
    // Calculate centering offsets
    const offsetX = (nextPieceCanvas.width - pieceWidth) / 2;
    const offsetY = (nextPieceCanvas.height - pieceHeight) / 2;

    // Draw the next piece
    for (let y = 0; y < nextPiece.shape.length; y++) {
        for (let x = 0; x < nextPiece.shape[y].length; x++) {
            if (nextPiece.shape[y][x]) {
                nextPieceCtx.fillStyle = nextPiece.color;
                nextPieceCtx.fillRect(
                    offsetX + x * blockSize,
                    offsetY + y * blockSize,
                    blockSize - 1,
                    blockSize - 1
                );
            }
        }
    }
}

// Add pause/resume functions
function pauseGame() {
    isGamePaused = true;
    if (gameInterval) {
        clearTimeout(gameInterval);
    }
}

function resumeGame() {
    if (isGamePaused) {
        isGamePaused = false;
        gameLoop();
    }
} 