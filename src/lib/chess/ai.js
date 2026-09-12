import { getBestMove } from "./engine.js";
import { getLegalMoveDetails, indexToAlgebraic } from "./game.js";

const promotionCodes = { queen: "q", rook: "r", bishop: "b", knight: "n" };

export function getLegalUCIMoves(game) {
  const moves = [];
  for (let from = 0; from < 64; from += 1) {
    if (game.board[from]?.color !== game.turn) continue;
    for (const move of getLegalMoveDetails(game, from)) {
      moves.push(
        `${indexToAlgebraic(from)}${indexToAlgebraic(move.to)}${
          move.promotion ? promotionCodes[move.promotion] : ""
        }`,
      );
    }
  }
  return moves;
}

const THINK_DELAY = { easy: 1200, medium: 2500, hard: 4000 };

export function requestGeminiMove(game, difficulty, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new DOMException("Aborted", "AbortError"), { name: "AbortError" }));
      return;
    }
    const delay = THINK_DELAY[difficulty] || THINK_DELAY.medium;
    const timer = setTimeout(() => {
      try {
        const move = getBestMove(game, difficulty);
        if (!move) {
          reject(new Error("No legal AI moves are available."));
          return;
        }
        resolve(move);
      } catch (error) {
        reject(error);
      }
    }, delay);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(Object.assign(new DOMException("Aborted", "AbortError"), { name: "AbortError" }));
    });
  });
}
