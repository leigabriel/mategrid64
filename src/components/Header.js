import GameControls from "@/components/GameControls";
import GameStatus from "@/components/GameStatus";
import MoveHistory from "@/components/MoveHistory";

export default function Header({
  game,
  aiStatus,
  difficulty,
  theme,
  canUndo,
  isHistoryOpen,
  isSettingsOpen,
  inMatch,
  onDifficultyChange,
  onThemeChange,
  onUndo,
  onReset,
  onToggleHistory,
  onToggleSettings,
  onChangeOpponent,
  onEditPlayer,
}) {
  return (
    <>
      <header className="site-header px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <div className="relative mx-auto flex w-full max-w-8xl items-center justify-start gap-3">
          <a
            href="#board"
            className="flex min-h-11 shrink-0 items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171713]"
            aria-label="MateGrid64 home"
          >
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
            {inMatch && (
              <button
                type="button"
                className="header-action"
                onClick={onChangeOpponent}
              >
                Change Opponent
              </button>
            )}
          </nav>

          <button
            type="button"
            className="history-toggle"
            data-intro-controls
            aria-label="Toggle settings menu"
            aria-expanded={isSettingsOpen}
            onClick={onToggleSettings}
          >
            <span />
            <span />
            <span />
          </button>

          {isSettingsOpen && (
            <div className="settings-menu">
              <div className="settings-menu__mobile-only">
                <GameControls canUndo={canUndo} onUndo={onUndo} onReset={onReset} />
              </div>
              {inMatch && (
                <button
                  type="button"
                  className="header-action settings-menu__player mobile-menu-action"
                  onClick={onEditPlayer}
                >
                  Player Settings
                </button>
              )}
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
              <label className="menu-difficulty">
                <span>Theme</span>
                <select
                  value={theme}
                  aria-label="Color theme"
                  onChange={(event) => onThemeChange(event.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              {inMatch && (
                <div className="settings-menu__mobile-only">
                  <button
                    type="button"
                    className="header-action settings-menu__player mobile-menu-action"
                    onClick={onChangeOpponent}
                  >
                    Change Opponent
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="history-dock">
        {isHistoryOpen && (
          <div className="history-dock__panel">
            <GameStatus game={game} aiStatus={aiStatus} />
            <MoveHistory moves={game.moveHistory} />
          </div>
        )}
        <button
          type="button"
          className="history-dock__toggle"
          aria-expanded={isHistoryOpen}
          onClick={onToggleHistory}
        >
          History
        </button>
      </div>
    </>
  );
}
