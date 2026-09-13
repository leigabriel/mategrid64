import { useRef, useEffect } from "react";
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
  const settingsRef = useRef(null);
  const hamburgerRef = useRef(null);
  const historyPanelRef = useRef(null);
  const historyToggleRef = useRef(null);

  useEffect(() => {
    if (!isSettingsOpen) return;

    function handleClickOutside(e) {
      const clickedSettings = settingsRef.current?.contains(e.target);
      const clickedHamburger = hamburgerRef.current?.contains(e.target);

      if (!clickedSettings && !clickedHamburger) {
        onToggleSettings();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen, onToggleSettings]);

  useEffect(() => {
    if (!isHistoryOpen) return;

    function handleClickOutside(e) {
      const clickedPanel = historyPanelRef.current?.contains(e.target);
      const clickedToggle = historyToggleRef.current?.contains(e.target);

      if (!clickedPanel && !clickedToggle) {
        onToggleHistory();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isHistoryOpen, onToggleHistory]);

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

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="header-action"
              onClick={onUndo}
              disabled={canUndo !== true}
            >
              Undo
            </button>

            <button
              ref={hamburgerRef}
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
          </div>

          {isSettingsOpen && (
            <div className="settings-menu" ref={settingsRef}>
              <button
                type="button"
                className="header-action settings-menu__item"
                onClick={() => {
                  onReset();
                  onToggleSettings();
                }}
              >
                New Game
              </button>
              {inMatch && (
                <button
                  type="button"
                  className="header-action settings-menu__item"
                  onClick={onChangeOpponent}
                >
                  Change Opponent
                </button>
              )}
              {inMatch && (
                <button
                  type="button"
                  className="header-action settings-menu__item"
                  onClick={onEditPlayer}
                >
                  Player
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
            </div>
          )}
        </div>
      </header>

      <div className="history-dock">
        {isHistoryOpen && (
          <div className="history-dock__panel" ref={historyPanelRef}>
            <GameStatus game={game} aiStatus={aiStatus} />
            <MoveHistory moves={game.moveHistory} />
          </div>
        )}
        <button
          ref={historyToggleRef}
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
