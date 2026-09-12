import { generateFEN } from "./fen.js";
import { getLegalMoveDetails, indexToAlgebraic } from "./game.js";

const promotionCodes = {
  queen: "q",
  rook: "r",
  bishop: "b",
  knight: "n",
};

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

export async function requestGeminiMove(game, difficulty, signal) {
  const legalMoves = getLegalUCIMoves(game);
  if (legalMoves.length === 0) throw new Error("No legal AI moves are available.");

  const response = await fetch("/api/ai-move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fen: generateFEN(game),
      legalMoves,
      difficulty,
    }),
    signal,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.move !== "string") {
    throw new Error(result.error || "AI move request failed.");
  }
  if (!legalMoves.includes(result.move)) {
    throw new Error("AI returned an invalid move.");
  }
  return result.move;
}
