import { indexToAlgebraic } from "./game.js";

const PIECE_SYMBOLS = {
  pawn: "p",
  knight: "n",
  bishop: "b",
  rook: "r",
  queen: "q",
  king: "k",
};

export function generateFEN(gameState) {
  const ranks = [];

  for (let row = 0; row < 8; row += 1) {
    let rank = "";
    let emptySquares = 0;

    for (let column = 0; column < 8; column += 1) {
      const current = gameState.board[row * 8 + column];
      if (!current) {
        emptySquares += 1;
        continue;
      }

      if (emptySquares) rank += emptySquares;
      emptySquares = 0;
      const symbol = PIECE_SYMBOLS[current.type];
      rank += current.color === "white" ? symbol.toUpperCase() : symbol;
    }

    if (emptySquares) rank += emptySquares;
    ranks.push(rank);
  }

  const castling = [
    gameState.castlingRights?.white?.kingSide ? "K" : "",
    gameState.castlingRights?.white?.queenSide ? "Q" : "",
    gameState.castlingRights?.black?.kingSide ? "k" : "",
    gameState.castlingRights?.black?.queenSide ? "q" : "",
  ].join("") || "-";
  const enPassant = indexToAlgebraic(gameState.enPassantTarget) || "-";

  return `${ranks.join("/")} ${gameState.turn === "black" ? "b" : "w"} ${castling} ${enPassant} ${gameState.halfmoveClock} ${gameState.fullmoveNumber}`;
}
