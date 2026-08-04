// Chess game with Minimax AI

// Piece Unicode characters
const PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Piece values for evaluation
const PIECE_VALUES = {
    'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900,
    'P': -10, 'N': -30, 'B': -30, 'R': -50, 'Q': -90, 'K': -900
};

// Difficulty settings
const DIFFICULTY_SETTINGS = {
    easy: { depth: 1, name: 'Mudah' },
    medium: { depth: 2, name: 'Sedang' },
    hard: { depth: 3, name: 'Sulit' },
    insane: { depth: 4, name: 'Gila' }
};

// Game state
let board = [];
let selectedSquare = null;
let currentPlayer = 'white'; // white = lowercase, black = uppercase
let moveHistory = [];
let capturedPieces = { white: [], black: [] };
let isGameOver = false;
let lastMove = null;
let kingPositions = { white: null, black: null };
let difficulty = 'hard';
let canCastle = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
};
let enPassantTarget = null;
let promotionPending = null;

// DOM elements
const chessboard = document.getElementById('chessboard');
const gameStatus = document.getElementById('game-status');
const aiThinking = document.getElementById('ai-thinking');
const gameOverDiv = document.getElementById('game-over');
const resultTitle = document.getElementById('result-title');
const restartBtn = document.getElementById('restart-btn');
const capturedWhiteDiv = document.getElementById('captured-white');
const capturedBlackDiv = document.getElementById('captured-black');
const moveHistoryDiv = document.getElementById('move-history');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const promotionModal = document.getElementById('promotion-modal');
const promotionPieces = document.querySelectorAll('.promotion-piece');

// Difficulty selector
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        difficulty = btn.dataset.difficulty;
        difficultyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Promotion piece selection
promotionPieces.forEach(piece => {
    piece.addEventListener('click', () => {
        if (promotionPending) {
            const newPiece = promotionPending.isWhite ? piece.dataset.piece : piece.dataset.piece.toUpperCase();
            board[promotionPending.row][promotionPending.col] = newPiece;
            
            const wasWhite = promotionPending.isWhite;
            promotionPending = null;
            promotionModal.classList.add('hidden');
            
            // Now complete the move: switch player and update status
            currentPlayer = wasWhite ? 'black' : 'white';
            updateStatus();
            checkGameOver();
            renderBoard();
            
            // If it's now AI's turn, let AI move
            if (!isGameOver && currentPlayer === 'black') {
                setTimeout(() => aiMove(), 500);
            }
        }
    });
});

// Initialize board
function initBoard() {
    board = [
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
    ];
    
    kingPositions = { white: { row: 7, col: 4 }, black: { row: 0, col: 4 } };
    selectedSquare = null;
    currentPlayer = 'white';
    moveHistory = [];
    capturedPieces = { white: [], black: [] };
    isGameOver = false;
    lastMove = null;
    canCastle = {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
    };
    enPassantTarget = null;
    promotionPending = null;
    
    updateCapturedDisplay();
    updateMoveHistory();
    renderBoard();
    updateStatus();
}

// Render board
function renderBoard() {
    chessboard.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.className += (row + col) % 2 === 0 ? ' light' : ' dark';
            square.dataset.row = row;
            square.dataset.col = col;
            
            const piece = board[row][col];
            if (piece) {
                const pieceSpan = document.createElement('span');
                pieceSpan.textContent = PIECES[piece];
                pieceSpan.className = piece === piece.toLowerCase() ? 'white-piece' : 'black-piece';
                square.appendChild(pieceSpan);
            }
            
            // Highlight selected square
            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('selected');
            }
            
            // Highlight last move
            if (lastMove && ((lastMove.from.row === row && lastMove.from.col === col) ||
                            (lastMove.to.row === row && lastMove.to.col === col))) {
                square.classList.add('last-move');
            }
            
            // Highlight check
            if (isKingInCheck(currentPlayer)) {
                const kingPos = kingPositions[currentPlayer];
                if (kingPos.row === row && kingPos.col === col) {
                    square.classList.add('check');
                }
            }
            
            square.addEventListener('click', () => handleSquareClick(row, col));
            chessboard.appendChild(square);
        }
    }
    
    // Show legal moves
    if (selectedSquare) {
        const moves = getLegalMoves(selectedSquare.row, selectedSquare.col);
        moves.forEach(move => {
            const square = chessboard.children[move.row * 8 + move.col];
            square.classList.add('legal-move');
        });
    }
}

// Handle square click
function handleSquareClick(row, col) {
    if (isGameOver || currentPlayer === 'black') return;
    
    const piece = board[row][col];
    
    if (selectedSquare) {
        // Try to move
        const moves = getLegalMoves(selectedSquare.row, selectedSquare.col);
        const validMove = moves.find(m => m.row === row && m.col === col);
        
        if (validMove) {
            makeMove(selectedSquare.row, selectedSquare.col, row, col, validMove);
            selectedSquare = null;
            
            if (!isGameOver && !promotionPending) {
                setTimeout(() => {
                    aiMove();
                }, 500);
            }
        } else if (piece && isPlayerPiece(piece, currentPlayer)) {
            selectedSquare = { row, col };
        } else {
            selectedSquare = null;
        }
    } else if (piece && isPlayerPiece(piece, currentPlayer)) {
        selectedSquare = { row, col };
    }
    
    renderBoard();
}

// Check if piece belongs to player
function isPlayerPiece(piece, player) {
    if (player === 'white') {
        return piece === piece.toLowerCase();
    } else {
        return piece === piece.toUpperCase();
    }
}

// Get legal moves for a piece
function getLegalMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    
    const moves = [];
    const type = piece.toLowerCase();
    const isWhite = piece === piece.toLowerCase();
    
    switch(type) {
        case 'p':
            moves.push(...getPawnMoves(row, col, isWhite));
            break;
        case 'n':
            moves.push(...getKnightMoves(row, col, isWhite));
            break;
        case 'b':
            moves.push(...getBishopMoves(row, col, isWhite));
            break;
        case 'r':
            moves.push(...getRookMoves(row, col, isWhite));
            break;
        case 'q':
            moves.push(...getQueenMoves(row, col, isWhite));
            break;
        case 'k':
            moves.push(...getKingMoves(row, col, isWhite));
            break;
    }
    
    // Filter out moves that would put own king in check
    return moves.filter(move => {
        return !wouldBeInCheck(row, col, move.row, move.col, currentPlayer);
    });
}

// Pawn moves
function getPawnMoves(row, col, isWhite) {
    const moves = [];
    const direction = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;
    
    // Move forward
    if (isValidSquare(row + direction, col) && !board[row + direction][col]) {
        moves.push({ row: row + direction, col });
        
        // Double move from start
        if (row === startRow && !board[row + 2 * direction][col]) {
            moves.push({ row: row + 2 * direction, col, isDoublePawnMove: true });
        }
    }
    
    // Capture diagonally
    for (const dc of [-1, 1]) {
        const newRow = row + direction;
        const newCol = col + dc;
        if (isValidSquare(newRow, newCol) && board[newRow][newCol] && 
            isPlayerPiece(board[newRow][newCol], isWhite ? 'black' : 'white')) {
            moves.push({ row: newRow, col: newCol });
        }
        
        // En passant
        if (enPassantTarget && enPassantTarget.row === newRow && enPassantTarget.col === newCol) {
            moves.push({ row: newRow, col: newCol, isEnPassant: true });
        }
    }
    
    return moves;
}

// Knight moves
function getKnightMoves(row, col, isWhite) {
    const moves = [];
    const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    
    for (const [dr, dc] of offsets) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidSquare(newRow, newCol) && 
            (!board[newRow][newCol] || isPlayerPiece(board[newRow][newCol], isWhite ? 'black' : 'white'))) {
            moves.push({ row: newRow, col: newCol });
        }
    }
    
    return moves;
}

// Bishop moves
function getBishopMoves(row, col, isWhite) {
    return getSlidingMoves(row, col, [[1,1], [1,-1], [-1,1], [-1,-1]], isWhite);
}

// Rook moves
function getRookMoves(row, col, isWhite) {
    return getSlidingMoves(row, col, [[1,0], [-1,0], [0,1], [0,-1]], isWhite);
}

// Queen moves
function getQueenMoves(row, col, isWhite) {
    return getSlidingMoves(row, col, [[1,1], [1,-1], [-1,1], [-1,-1], [1,0], [-1,0], [0,1], [0,-1]], isWhite);
}

// King moves
function getKingMoves(row, col, isWhite) {
    const moves = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const newRow = row + dr;
            const newCol = col + dc;
            if (isValidSquare(newRow, newCol) && 
                (!board[newRow][newCol] || isPlayerPiece(board[newRow][newCol], isWhite ? 'black' : 'white'))) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    }
    
    // Castling
    const player = isWhite ? 'white' : 'black';
    const kingRow = isWhite ? 7 : 0;
    
    // King-side castling
    if (canCastle[player].kingSide && row === kingRow && col === 4) {
        if (!board[kingRow][5] && !board[kingRow][6] && board[kingRow][7]) {
            // Check if king doesn't pass through check
            if (!isKingInCheck(player) && 
                !wouldBeInCheck(row, col, kingRow, 5, player) &&
                !wouldBeInCheck(row, col, kingRow, 6, player)) {
                moves.push({ row: kingRow, col: 6, isCastling: true, castlingSide: 'king' });
            }
        }
    }
    
    // Queen-side castling
    if (canCastle[player].queenSide && row === kingRow && col === 4) {
        if (!board[kingRow][3] && !board[kingRow][2] && !board[kingRow][1] && board[kingRow][0]) {
            // Check if king doesn't pass through check
            if (!isKingInCheck(player) && 
                !wouldBeInCheck(row, col, kingRow, 3, player) &&
                !wouldBeInCheck(row, col, kingRow, 2, player)) {
                moves.push({ row: kingRow, col: 2, isCastling: true, castlingSide: 'queen' });
            }
        }
    }
    
    return moves;
}

// Sliding moves (for bishop, rook, queen)
function getSlidingMoves(row, col, directions, isWhite) {
    const moves = [];
    
    for (const [dr, dc] of directions) {
        let newRow = row + dr;
        let newCol = col + dc;
        
        while (isValidSquare(newRow, newCol)) {
            if (!board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (isPlayerPiece(board[newRow][newCol], isWhite ? 'black' : 'white')) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
            newRow += dr;
            newCol += dc;
        }
    }
    
    return moves;
}

// Check if square is valid
function isValidSquare(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Make a move
function makeMove(fromRow, fromCol, toRow, toCol, moveData = {}) {
    const piece = board[fromRow][fromCol];
    const captured = board[toRow][toCol];
    const isWhite = piece === piece.toLowerCase();
    const player = isWhite ? 'white' : 'black';
    
    // Handle en passant capture
    if (moveData.isEnPassant) {
        const capturedPawnRow = isWhite ? toRow + 1 : toRow - 1;
        const capturedPawn = board[capturedPawnRow][toCol];
        if (capturedPawn) {
            const capturedColor = capturedPawn === capturedPawn.toLowerCase() ? 'white' : 'black';
            capturedPieces[capturedColor].push(capturedPawn);
            board[capturedPawnRow][toCol] = '';
            updateCapturedDisplay();
        }
    }
    
    // Capture piece
    if (captured) {
        const capturedColor = captured === captured.toLowerCase() ? 'white' : 'black';
        capturedPieces[capturedColor].push(captured);
        updateCapturedDisplay();
    }
    
    // Handle castling
    if (moveData.isCastling) {
        const kingRow = isWhite ? 7 : 0;
        if (moveData.castlingSide === 'king') {
            // Move rook from h-file to f-file
            board[kingRow][5] = board[kingRow][7];
            board[kingRow][7] = '';
        } else {
            // Move rook from a-file to d-file
            board[kingRow][3] = board[kingRow][0];
            board[kingRow][0] = '';
        }
        canCastle[player].kingSide = false;
        canCastle[player].queenSide = false;
    }
    
    // Move piece
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = '';
    
    // Update castling rights
    if (piece.toLowerCase() === 'k') {
        kingPositions[player] = { row: toRow, col: toCol };
        canCastle[player].kingSide = false;
        canCastle[player].queenSide = false;
    }
    
    if (piece.toLowerCase() === 'r') {
        if (fromCol === 0) canCastle[player].queenSide = false;
        if (fromCol === 7) canCastle[player].kingSide = false;
    }
    
    // Set en passant target
    if (moveData.isDoublePawnMove) {
        enPassantTarget = { row: isWhite ? toRow + 1 : toRow - 1, col: toCol };
    } else {
        enPassantTarget = null;
    }
    
    // Check for pawn promotion
    if (piece.toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
        // Record move first
        lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
        const notation = `${PIECES[piece]} ${String.fromCharCode(97 + fromCol)}${8 - fromRow} → ${String.fromCharCode(97 + toCol)}${8 - toRow} (Promosi)`;
        moveHistory.push(notation);
        updateMoveHistory();
        
        // Set promotion pending (but DON'T switch player yet)
        promotionPending = { row: toRow, col: toCol, isWhite: isWhite };
        promotionModal.classList.remove('hidden');
        return; // Wait for promotion choice
    }
    
    // Record move
    lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
    const notation = `${PIECES[piece]} ${String.fromCharCode(97 + fromCol)}${8 - fromRow} → ${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    moveHistory.push(notation);
    updateMoveHistory();
    
    // Switch player
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    updateStatus();
    
    // Check for game over
    checkGameOver();
}

// Check if move would put king in check
function wouldBeInCheck(fromRow, fromCol, toRow, toCol, player) {
    // Simulate move
    const piece = board[fromRow][fromCol];
    const captured = board[toRow][toCol];
    const oldKingPos = { ...kingPositions[player] };
    
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = '';
    
    if (piece.toLowerCase() === 'k') {
        kingPositions[player] = { row: toRow, col: toCol };
    }
    
    const inCheck = isKingInCheck(player);
    
    // Undo move
    board[fromRow][fromCol] = piece;
    board[toRow][toCol] = captured;
    kingPositions[player] = oldKingPos;
    
    return inCheck;
}

// Check if king is in check
function isKingInCheck(player) {
    const kingPos = kingPositions[player];
    const opponent = player === 'white' ? 'black' : 'white';
    
    // Check all opponent pieces
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && isPlayerPiece(piece, opponent)) {
                const moves = getLegalMovesWithoutCheckValidation(row, col);
                if (moves.some(m => m.row === kingPos.row && m.col === kingPos.col)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Get legal moves without check validation (to avoid recursion)
function getLegalMovesWithoutCheckValidation(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    
    const type = piece.toLowerCase();
    const isWhite = piece === piece.toLowerCase();
    
    switch(type) {
        case 'p': return getPawnMoves(row, col, isWhite);
        case 'n': return getKnightMoves(row, col, isWhite);
        case 'b': return getBishopMoves(row, col, isWhite);
        case 'r': return getRookMoves(row, col, isWhite);
        case 'q': return getQueenMoves(row, col, isWhite);
        case 'k': return getKingMoves(row, col, isWhite);
        default: return [];
    }
}

// Check for checkmate or stalemate
function checkGameOver() {
    const hasLegalMoves = hasAnyLegalMoves(currentPlayer);
    const inCheck = isKingInCheck(currentPlayer);
    
    if (!hasLegalMoves) {
        isGameOver = true;
        gameOverDiv.classList.remove('hidden');
        
        if (inCheck) {
            const winner = currentPlayer === 'white' ? 'Hitam' : 'Putih';
            resultTitle.textContent = `SKAKMAT! ${winner} Menang!`;
        } else {
            resultTitle.textContent = 'PAT! Seri!';
        }
    }
}

// Check if player has any legal moves
function hasAnyLegalMoves(player) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && isPlayerPiece(piece, player)) {
                const moves = getLegalMoves(row, col);
                if (moves.length > 0) return true;
            }
        }
    }
    return false;
}

// Update status
function updateStatus() {
    if (isGameOver) return;
    
    const playerText = currentPlayer === 'white' ? 'Anda (Putih)' : 'AI (Hitam)';
    gameStatus.textContent = `Giliran ${playerText}`;
    
    if (isKingInCheck(currentPlayer)) {
        gameStatus.textContent += ' - SKAK!';
        gameStatus.classList.add('check');
    } else {
        gameStatus.classList.remove('check');
    }
}

// Update captured pieces display
function updateCapturedDisplay() {
    capturedWhiteDiv.innerHTML = capturedPieces.white.map(p => PIECES[p]).join(' ');
    capturedBlackDiv.innerHTML = capturedPieces.black.map(p => PIECES[p]).join(' ');
}

// Update move history
function updateMoveHistory() {
    moveHistoryDiv.innerHTML = moveHistory.map((m, i) => `${i + 1}. ${m}`).join('<br>');
    moveHistoryDiv.scrollTop = moveHistoryDiv.scrollHeight;
}

// AI Move with Minimax
function aiMove() {
    aiThinking.classList.remove('hidden');
    
    setTimeout(() => {
        const bestMove = findBestMove();
        
        if (bestMove) {
            makeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol, bestMove);
            
            // Handle AI pawn promotion (always choose queen)
            if (promotionPending) {
                board[promotionPending.row][promotionPending.col] = 'Q';
                promotionPending = null;
                renderBoard();
            }
        }
        
        aiThinking.classList.add('hidden');
        renderBoard();
    }, 500);
}

// Find best move using Minimax
function findBestMove() {
    let bestValue = -Infinity;
    let bestMove = null;
    
    const allMoves = getAllPossibleMoves('black');
    const searchDepth = DIFFICULTY_SETTINGS[difficulty].depth;
    
    for (const move of allMoves) {
        // Simulate move
        const piece = board[move.fromRow][move.fromCol];
        const captured = board[move.toRow][move.toCol];
        const oldKingPos = piece.toLowerCase() === 'k' ? { ...kingPositions.black } : null;
        
        board[move.toRow][move.toCol] = piece;
        board[move.fromRow][move.fromCol] = '';
        if (oldKingPos) kingPositions.black = { row: move.toRow, col: move.toCol };
        
        const moveValue = minimax(searchDepth, -Infinity, Infinity, false);
        
        // Undo move
        board[move.fromRow][move.fromCol] = piece;
        board[move.toRow][move.toCol] = captured;
        if (oldKingPos) kingPositions.black = oldKingPos;
        
        if (moveValue > bestValue) {
            bestValue = moveValue;
            bestMove = move;
        }
    }
    
    return bestMove;
}

// Minimax algorithm with alpha-beta pruning
function minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0) {
        return evaluateBoard();
    }
    
    const player = isMaximizing ? 'black' : 'white';
    const allMoves = getAllPossibleMoves(player);
    
    if (allMoves.length === 0) {
        if (isKingInCheck(player)) {
            return isMaximizing ? -10000 : 10000;
        }
        return 0; // Stalemate
    }
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        
        for (const move of allMoves) {
            const piece = board[move.fromRow][move.fromCol];
            const captured = board[move.toRow][move.toCol];
            const oldKingPos = piece.toLowerCase() === 'k' ? { ...kingPositions[player] } : null;
            
            board[move.toRow][move.toCol] = piece;
            board[move.fromRow][move.fromCol] = '';
            if (oldKingPos) kingPositions[player] = { row: move.toRow, col: move.toCol };
            
            const evaluation = minimax(depth - 1, alpha, beta, false);
            
            board[move.fromRow][move.fromCol] = piece;
            board[move.toRow][move.toCol] = captured;
            if (oldKingPos) kingPositions[player] = oldKingPos;
            
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            
            if (beta <= alpha) break;
        }
        
        return maxEval;
    } else {
        let minEval = Infinity;
        
        for (const move of allMoves) {
            const piece = board[move.fromRow][move.fromCol];
            const captured = board[move.toRow][move.toCol];
            const oldKingPos = piece.toLowerCase() === 'k' ? { ...kingPositions[player] } : null;
            
            board[move.toRow][move.toCol] = piece;
            board[move.fromRow][move.fromCol] = '';
            if (oldKingPos) kingPositions[player] = { row: move.toRow, col: move.toCol };
            
            const evaluation = minimax(depth - 1, alpha, beta, true);
            
            board[move.fromRow][move.fromCol] = piece;
            board[move.toRow][move.toCol] = captured;
            if (oldKingPos) kingPositions[player] = oldKingPos;
            
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            
            if (beta <= alpha) break;
        }
        
        return minEval;
    }
}

// Get all possible moves for a player
function getAllPossibleMoves(player) {
    const moves = [];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && isPlayerPiece(piece, player)) {
                const pieceMoves = getLegalMoves(row, col);
                pieceMoves.forEach(move => {
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: move.row,
                        toCol: move.col,
                        isCastling: move.isCastling,
                        castlingSide: move.castlingSide,
                        isEnPassant: move.isEnPassant,
                        isDoublePawnMove: move.isDoublePawnMove
                    });
                });
            }
        }
    }
    
    return moves;
}

// Evaluate board position
function evaluateBoard() {
    let score = 0;
    
    // Material value
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                score += PIECE_VALUES[piece];
            }
        }
    }
    
    // Positional bonuses (center control)
    for (let row = 3; row <= 4; row++) {
        for (let col = 3; col <= 4; col++) {
            const piece = board[row][col];
            if (piece) {
                score += piece === piece.toLowerCase() ? -2 : 2;
            }
        }
    }
    
    return score;
}

// Restart game
function restartGame() {
    gameOverDiv.classList.add('hidden');
    initBoard();
}

// Event listeners
restartBtn.addEventListener('click', restartGame);

// Initialize
initBoard();
