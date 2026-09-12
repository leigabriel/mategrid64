import ChessPiece from "@/components/ChessPiece";
import GameControls from "@/components/GameControls";
import GameStatus from "@/components/GameStatus";
import MoveHistory from "@/components/MoveHistory";

export default function Header({
  headerRef,
  game,
  aiStatus,
  difficulty,
  canUndo,
  isHistoryOpen,
  onDifficultyChange,
  onUndo,
  onReset,
  onToggleHistory,
}) {
  return (
    <header
      ref={headerRef}
      className="site-header px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6"
    >
      <div className="relative mx-auto flex w-full max-w-8xl items-center justify-between gap-3">
        <a
          href="#board"
          className="flex min-h-11 shrink-0 items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171713]"
          aria-label="MateGrid64 home"
        >
          <span className="header-queen" aria-hidden="true">
            <ChessPiece type="queen" color="white" />
          </span>
          <span className="brand-name">MateGrid64</span>
        </a>

        <nav className="desktop-actions" aria-label="Game actions" data-intro-controls>
          <button
            type="button"
            className="header-action"
            onClick={onUndo}
            disabled={canUndo !== true}
          >
            Undo
          </button>
          <button type="button" className="header-action" onClick={onReset}>
            New game
          </button>
          <label className="difficulty-control">
            <span>Difficulty</span>
            <select
              value={difficulty}
              aria-label="AI difficulty"
              onChange={(event) => onDifficultyChange(event.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <button
            type="button"
            className="header-action"
            aria-expanded={isHistoryOpen}
            onClick={onToggleHistory}
          >
            History
          </button>
        </nav>

        <button
          type="button"
          className="history-toggle mobile-menu-toggle"
          data-intro-controls
          aria-label="Toggle game menu"
          aria-expanded={isHistoryOpen}
          onClick={onToggleHistory}
        >
          <span />
          <span />
          <span />
        </button>

        {isHistoryOpen && (
          <div className="history-menu">
            <GameStatus game={game} aiStatus={aiStatus} />
            <label className="menu-difficulty">
              <span>Difficulty</span>
              <select
                value={difficulty}
                aria-label="AI difficulty"
                onChange={(event) => onDifficultyChange(event.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <GameControls canUndo={canUndo} onUndo={onUndo} onReset={onReset} />
            <MoveHistory moves={game.moveHistory} />
          </div>
        )}
      </div>
    </header>
  );
}
