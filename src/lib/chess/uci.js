import { algebraicToIndex } from "./game.js";

const PROMOTIONS = {
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
};

export function parseUCIMove(input) {
  if (typeof input !== "string") return null;
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/i.exec(input);
  if (!match) return null;

  return {
    from: algebraicToIndex(match[1].toLowerCase()),
    to: algebraicToIndex(match[2].toLowerCase()),
    promotion: match[3] ? PROMOTIONS[match[3].toLowerCase()] : null,
  };
}
