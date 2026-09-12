const drawLabels = {
  stalemate: "Draw by stalemate.",
  "fifty-move-rule": "Draw by fifty-move rule.",
  "insufficient-material": "Draw by insufficient material.",
  "threefold-repetition": "Draw by repetition.",
};

function statusText(game) {
  const side = game.turn === "white" ? "White" : "Black";
  if (game.status === "checkmate") {
    const winner = game.winner === "white" ? "White" : "Black";
    return `Checkmate. ${winner} wins.`;
  }
  if (game.status === "stalemate" || game.status === "draw") {
    return drawLabels[game.drawReason] || "Draw.";
  }
  if (game.status === "check") return `${side} is in check.`;
  return `${side} to move.`;
}

export default function GameStatus({ game, aiStatus }) {
  const terminal = ["checkmate", "stalemate", "draw"].includes(game.status);
  const text =
    aiStatus === "thinking"
      ? "AI thinking..."
      : aiStatus === "loading"
        ? "AI preparing move..."
        : aiStatus === "error"
          ? "AI unavailable."
          : statusText(game);

  return (
    <div className="status-block" role="status" aria-live="polite">
      <span className={`status-pip status-pip--${game.status}`} aria-hidden="true" />
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#77776f]">
          {terminal ? "Game over" : "Game status"}
        </p>
        <p className="mt-1 text-sm font-semibold">{text}</p>
      </div>
    </div>
  );
}
