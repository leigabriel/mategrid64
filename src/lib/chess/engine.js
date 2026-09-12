import {
  getLegalMoveDetails,
  makeMove,
  isKingInCheck,
  indexToAlgebraic,
} from "./game.js";

const PIECE_VALUES = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000 };

const PST = {
  pawn: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  knight: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  bishop: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  rook: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  queen: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  king: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

function evaluate(game) {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = game.board[i];
    if (!p) continue;
    const material = PIECE_VALUES[p.type];
    const row = Math.floor(i / 8);
    const col = i % 8;
    const pstRow = p.color === "white" ? row : 7 - row;
    const positional = PST[p.type][pstRow * 8 + col];
    score += p.color === "white" ? material + positional : -(material + positional);
  }
  return game.turn === "white" ? score : -score;
}

function orderMoves(game, moves) {
  return moves.sort((a, b) => {
    let sa = 0, sb = 0;
    if (a.captured) sa += PIECE_VALUES[a.captured.type] * 10 - PIECE_VALUES[game.board[a.from]?.type || "pawn"];
    if (b.captured) sb += PIECE_VALUES[b.captured.type] * 10 - PIECE_VALUES[game.board[b.from]?.type || "pawn"];
    if (a.promotion) sa += PIECE_VALUES[a.promotion];
    if (b.promotion) sb += PIECE_VALUES[b.promotion];
    return sb - sa;
  });
}

function minimax(game, depth, alpha, beta, maximizing) {
  if (depth === 0) return { score: evaluate(game), move: null };

  const color = maximizing ? "white" : "black";
  const allMoves = [];
  for (let from = 0; from < 64; from++) {
    if (game.board[from]?.color === color) {
      allMoves.push(...getLegalMoveDetails(game, from));
    }
  }

  if (allMoves.length === 0) {
    const inCheck = isKingInCheck(game.board, color);
    return { score: inCheck ? (maximizing ? -99999 + (4 - depth) : 99999 - (4 - depth)) : 0, move: null };
  }

  const moves = orderMoves(game, allMoves);
  let bestMove = moves[0];

  if (maximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const next = makeMove(game, move.from, move.to, move.promotion);
      if (next === game) continue;
      const { score } = minimax(next, depth - 1, alpha, beta, false);
      if (score > maxScore) { maxScore = score; bestMove = move; }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      const next = makeMove(game, move.from, move.to, move.promotion);
      if (next === game) continue;
      const { score } = minimax(next, depth - 1, alpha, beta, true);
      if (score < minScore) { minScore = score; bestMove = move; }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minScore, move: bestMove };
  }
}

const DEPTH = { easy: 2, medium: 3, hard: 4 };

export function getBestMove(game, difficulty = "medium") {
  const depth = DEPTH[difficulty] || DEPTH.medium;
  const { move } = minimax(game, depth, -Infinity, Infinity, game.turn === "white");
  if (!move) return null;
  return `${indexToAlgebraic(move.from)}${indexToAlgebraic(move.to)}${move.promotion ? move.promotion[0] : ""}`;
}
