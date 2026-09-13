export default function GameOverModal({ result, opponentName, onNewGame }) {
  const isWin = result === "win";
  const title = isWin ? "Checkmate - You Win!" : result === "lose" ? "Checkmate - You Lose" : "Draw";
  const subtitle = isWin
    ? `${opponentName} has no moves left.`
    : result === "lose"
      ? "Your king has been checkmated."
      : "The game ended in a draw.";

  return (
    <div className="game-over-backdrop">
      <div className="game-over-dialog" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
        <p id="gameover-title" className="game-over-dialog__title">
          {title}
        </p>
        <p className="game-over-dialog__subtitle">{subtitle}</p>
        <button
          type="button"
          className="pixel-button game-over-dialog__btn"
          onClick={onNewGame}
        >
          New Game
        </button>
      </div>
    </div>
  );
}
