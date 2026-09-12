export default function GameControls({
  canUndo,
  onUndo,
  onReset,
}) {
  return (
    <div className="grid grid-cols-2 gap-2" aria-label="Game controls">
      <button
        type="button"
        className="pixel-button"
        onClick={onUndo}
        disabled={!canUndo}
      >
        Undo
      </button>
      <button
        type="button"
        className="pixel-button pixel-button--dark"
        onClick={onReset}
      >
        New game
      </button>
    </div>
  );
}
