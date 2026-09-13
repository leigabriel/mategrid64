"use client";

import { useEffect, useReducer, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";

import ChessBoard from "@/components/ChessBoard";
import Header from "@/components/Header";
import PromotionModal from "@/components/PromotionModal";
import GameOverModal from "@/components/GameOverModal";
import OpponentSelect from "@/components/opponents/OpponentSelect";
import PlayerSetup from "@/components/opponents/PlayerSetup";
import { requestGeminiMove } from "@/lib/chess/ai";
import {
  createInitialGameState,
  getLegalMoves,
  makeMove,
} from "@/lib/chess/game";
import { parseUCIMove } from "@/lib/chess/uci";
import { opponents } from "@/lib/opponents";
import {
  getRandomDialogue,
  shouldSpeak,
  incrementMoveCount,
  hasCooldown,
  resetDialogueState,
} from "@/lib/dialogue";

function initialInterfaceState() {
  return {
    game: createInitialGameState(),
    selectedSquare: null,
    legalMoves: [],
    pendingPromotion: null,
    snapshots: [],
    lastCaptureSquare: null,
  };
}

function completeMove(state, from, to, promotion) {
  const capturedPiece = state.game.board[to];
  const game = makeMove(state.game, from, to, promotion);
  if (game === state.game) return state;
  return {
    game,
    selectedSquare: null,
    legalMoves: [],
    pendingPromotion: null,
    snapshots: [...state.snapshots, state.game],
    lastCaptureSquare: capturedPiece ? to : null,
  };
}

function deferMove(state, from, to, promotion) {
  return {
    ...state,
    _pendingMove: { from, to, promotion },
  };
}

function gameReducer(state, action) {
  if (action.type === "RESET") return initialInterfaceState();
  if (action.type === "RESTORE") return action.state;
  if (action.type === "UNDO") {
    if (state.pendingPromotion) return { ...state, pendingPromotion: null };
    if (state.snapshots.length === 0) return state;
    const count = Math.min(action.count || 1, state.snapshots.length);
    const restoreIndex = state.snapshots.length - count;
    return {
      game: state.snapshots[restoreIndex],
      selectedSquare: null,
      legalMoves: [],
      pendingPromotion: null,
      snapshots: state.snapshots.slice(0, restoreIndex),
      lastCaptureSquare: null,
    };
  }
  if (action.type === "COMMIT_MOVE") {
    return completeMove(state, action.from, action.to, action.promotion);
  }
  if (action.type === "CLEAR_CAPTURE") {
    return { ...state, lastCaptureSquare: null };
  }
  if (action.type === "PROMOTE" && state.pendingPromotion) {
    return deferMove(
      state,
      state.pendingPromotion.from,
      state.pendingPromotion.to,
      action.piece,
    );
  }
  if (action.type === "AI_MOVE") {
    return deferMove(state, action.from, action.to, action.promotion || undefined);
  }
  if (action.type !== "SELECT" || state.pendingPromotion) return state;
  if (!["playing", "check"].includes(state.game.status)) return state;

  const targetPiece = state.game.board[action.index];
  if (targetPiece?.color === state.game.turn) {
    return {
      ...state,
      selectedSquare: action.index,
      legalMoves: getLegalMoves(state.game, action.index),
    };
  }
  if (
    state.selectedSquare !== null &&
    state.legalMoves.includes(action.index)
  ) {
    const movingPiece = state.game.board[state.selectedSquare];
    if (movingPiece.type === "pawn" && Math.floor(action.index / 8) === 0) {
      return {
        ...state,
        pendingPromotion: { from: state.selectedSquare, to: action.index },
      };
    }
    return deferMove(state, state.selectedSquare, action.index);
  }
  return { ...state, selectedSquare: null, legalMoves: [] };
}

const DEFAULT_AVATAR = (
  <svg viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="28" height="28">
    <rect x="2" y="1" width="4" height="4" fill="#171713" />
    <rect x="1" y="5" width="6" height="2" fill="#171713" />
  </svg>
);

const GAME_STORAGE_KEY = "mategrid-game-state";
const PLAYER_STORAGE_KEY = "mategrid-player-profile";
const THEME_STORAGE_KEY = "mategrid-theme";

function loadSavedGame() {
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveGame(snapshot) {
  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {}
}

function clearSavedGame() {
  try {
    localStorage.removeItem(GAME_STORAGE_KEY);
  } catch {}
}

function loadSavedPlayer() {
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePlayer(player) {
  try {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  } catch {}
}

function loadSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export default function ChessGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialInterfaceState);
  const [difficulty, setDifficulty] = useState("medium");
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiError, setAIError] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [pendingAnimation, setPendingAnimation] = useState(null);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [selectedOpponentId, setSelectedOpponentId] = useState(null);
  const [dialogueText, setDialogueText] = useState(null);
  const [player, setPlayer] = useState({ name: "Player", portrait: null });
  const [hasPlayerProfile, setHasPlayerProfile] = useState(false);
  const [isPlayerSettingsOpen, setIsPlayerSettingsOpen] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [step, setStep] = useState("select");
  const [hasHydrated, setHasHydrated] = useState(false);
  const aiControllerRef = useRef(null);
  const aiRequestRef = useRef(0);
  const boardRef = useRef(null);
  const animationRef = useRef(null);
  const pendingMoveRef = useRef(null);
  const reduceMotionRef = useRef(false);
  const dialogueTimerRef = useRef(null);
  const hasSpokenRef = useRef({ intro: false, firstCapture: false, firstCheck: false });
  const audioCtxRef = useRef(null);
  const placeBufferRef = useRef(null);

  const selectedOpponent = opponents.find((o) => o.id === selectedOpponentId) || null;
  const inMatch = step === "match" && selectedOpponent !== null;
  const canUndo = state.snapshots.length > 0 || Boolean(state.pendingPromotion);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;

      const savedGame = loadSavedGame();
      const savedPlayer = loadSavedPlayer();
      const savedTheme = loadSavedTheme();
      const hasSavedOpponent = opponents.some(
        (opponent) => opponent.id === savedGame?.selectedOpponentId,
      );

      if (savedGame?.game && hasSavedOpponent) {
        dispatch({
          type: "RESTORE",
          state: {
            game: savedGame.game,
            selectedSquare: null,
            legalMoves: [],
            pendingPromotion: null,
            snapshots: savedGame.snapshots || [],
            lastCaptureSquare: null,
          },
        });
        setSelectedOpponentId(savedGame.selectedOpponentId);
        setPlayer(savedGame.player || savedPlayer || { name: "Player", portrait: null });
        setHasPlayerProfile(Boolean(savedGame.player || savedPlayer));
        setDifficulty(savedGame.difficulty || "medium");
        setStep("match");
      } else if (savedPlayer) {
        setPlayer(savedPlayer);
        setHasPlayerProfile(true);
      }
      setTheme(savedTheme);
      setHasHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hasHydrated && step === "match" && selectedOpponentId) {
      saveGame({
        game: state.game,
        snapshots: state.snapshots,
        selectedOpponentId,
        player,
        step,
        difficulty,
      });
    }
  }, [hasHydrated, state.game, state.snapshots, selectedOpponentId, player, step, difficulty]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const speak = useCallback((category, speaker = selectedOpponent) => {
    if (!speaker) return;
    if (dialogueTimerRef.current) return;

    const line = getRandomDialogue(speaker, category);
    if (!line) return;

    setDialogueText(line);
    dialogueTimerRef.current = setTimeout(() => {
      setDialogueText(null);
      dialogueTimerRef.current = null;
    }, 2000);
  }, [selectedOpponent]);

  useEffect(() => {
    return () => {
      if (dialogueTimerRef.current) clearTimeout(dialogueTimerRef.current);
    };
  }, []);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    fetch("/sfx/place-sfx.mp3")
      .then((res) => res.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        placeBufferRef.current = decoded;
      })
      .catch(() => {});
    return () => {
      ctx.close().catch(() => {});
    };
  }, []);

  function playPlaceSound() {
    const ctx = audioCtxRef.current;
    const buffer = placeBufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  }

  useEffect(() => {
    if (reduceMotionRef.current || !boardRef.current || !inMatch) return;
    const board = boardRef.current;
    const squares = board.querySelectorAll("[data-chess-square]");
    const blackPieces = board.querySelectorAll('[data-piece-color="black"]');
    const whitePieces = board.querySelectorAll('[data-piece-color="white"]');

    gsap.set(squares, { opacity: 0, y: 4 });
    gsap.set(blackPieces, { opacity: 0, y: -10 });
    gsap.set(whitePieces, { opacity: 0, y: 10 });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(squares, { opacity: 1, y: 0, duration: 0.2, stagger: 0.006 })
      .to(blackPieces, { opacity: 1, y: 0, duration: 0.25, stagger: 0.015 }, 0.15)
      .to(whitePieces, { opacity: 1, y: 0, duration: 0.25, stagger: 0.015 }, 0.3)
      .then(() => {
        gsap.set([...squares, ...blackPieces, ...whitePieces], {
          clearProps: "transform,opacity",
        });
      });
  }, [inMatch]);

  const isAITurn =
    state.game.turn === "black" &&
    ["playing", "check"].includes(state.game.status);
  const canPlayerMove = !isAIThinking && !isAITurn;
  const aiStatus = aiError
    ? "error"
    : isAIThinking
      ? "thinking"
      : isAITurn
        ? "loading"
        : null;

  useEffect(() => {
    if (!isAITurn || aiError || !inMatch) return;

    const requestId = ++aiRequestRef.current;
    const controller = new AbortController();
    aiControllerRef.current = controller;
    queueMicrotask(() => {
      if (requestId === aiRequestRef.current) setIsAIThinking(true);
    });

    requestGeminiMove(state.game, difficulty, controller.signal)
      .then((uciMove) => {
        if (requestId !== aiRequestRef.current) return;
        const move = parseUCIMove(uciMove);
        const nextGame = move
          ? makeMove(
              state.game,
              move.from,
              move.to,
              move.promotion || undefined,
            )
          : state.game;
        if (!move || nextGame === state.game) {
          setAIError(true);
          return;
        }
        dispatch({ type: "AI_MOVE", ...move });
      })
      .catch((error) => {
        if (requestId === aiRequestRef.current && error.name !== "AbortError") {
          setAIError(true);
        }
      })
      .finally(() => {
        if (requestId === aiRequestRef.current) {
          setIsAIThinking(false);
          aiControllerRef.current = null;
        }
      });

    return () => controller.abort();
  }, [aiError, difficulty, isAITurn, state.game, inMatch]);

  useEffect(() => {
    const pending = state._pendingMove;
    if (!pending) return;

    pendingMoveRef.current = pending;

    if (reduceMotionRef.current || !boardRef.current) {
      playPlaceSound();
      dispatch({ type: "COMMIT_MOVE", ...pending });
      pendingMoveRef.current = null;
      return;
    }

    const fromEl = boardRef.current.querySelector(`[data-square="${pending.from}"]`);
    const toEl = boardRef.current.querySelector(`[data-square="${pending.to}"]`);
    if (!fromEl || !toEl) {
      playPlaceSound();
      dispatch({ type: "COMMIT_MOVE", ...pending });
      pendingMoveRef.current = null;
      return;
    }

    const piece = state.game.board[pending.from];
    if (!piece) {
      playPlaceSound();
      dispatch({ type: "COMMIT_MOVE", ...pending });
      pendingMoveRef.current = null;
      return;
    }

    const boardEl = boardRef.current.querySelector("#board");
    if (!boardEl) {
      playPlaceSound();
      dispatch({ type: "COMMIT_MOVE", ...pending });
      pendingMoveRef.current = null;
      return;
    }

    const boardRect = boardEl.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const startX = fromRect.left - boardRect.left;
    const startY = fromRect.top - boardRect.top;
    const endX = toRect.left - boardRect.left;
    const endY = toRect.top - boardRect.top;

    animationRef.current?.kill();

    setPendingAnimation({
      piece,
      from: pending.from,
      to: pending.to,
      startX,
      startY,
      endX,
      endY,
    });

    return () => {
      animationRef.current?.kill();
      animationRef.current = null;
    };
  }, [state._pendingMove, state.game]);

  useEffect(() => {
    if (!pendingAnimation) return;

    const overlay = boardRef.current?.querySelector(".move-animation-overlay");
    if (!overlay) {
      playPlaceSound();
      if (pendingMoveRef.current) {
        dispatch({ type: "COMMIT_MOVE", ...pendingMoveRef.current });
        pendingMoveRef.current = null;
      }
      setPendingAnimation(null);
      return;
    }

    const { startX, startY, endX, endY } = pendingAnimation;

    const tl = gsap.timeline({
      onComplete: () => {
        animationRef.current = null;
        playPlaceSound();
        if (pendingMoveRef.current) {
          dispatch({ type: "COMMIT_MOVE", ...pendingMoveRef.current });
          pendingMoveRef.current = null;
        }
        setPendingAnimation(null);
      },
    });

    gsap.set(overlay, { x: startX, y: startY, opacity: 1 });
    tl.to(overlay, {
      x: endX,
      y: endY,
      duration: 0.25,
      ease: "power2.inOut",
    });

    animationRef.current = tl;

    return () => {
      tl.kill();
      animationRef.current = null;
    };
  }, [pendingAnimation]);

  useEffect(() => {
    if (!state.lastCaptureSquare) return;
    const timer = setTimeout(() => {
      dispatch({ type: "CLEAR_CAPTURE" });
    }, 400);
    return () => clearTimeout(timer);
  }, [state.lastCaptureSquare]);

  useEffect(() => {
    if (!inMatch) return;
    const status = state.game.status;
    const moveCount = state.game.moveHistory.length;

    if (status === "checkmate") {
      const winner = state.game.winner;
      queueMicrotask(() => speak(winner === "white" ? "win" : "lose"));
      setGameResult(winner === "white" ? "win" : "lose");
      return;
    }
    if (status === "stalemate" || status === "draw") {
      queueMicrotask(() => speak("draw"));
      setGameResult("draw");
      return;
    }

    if (state.lastCaptureSquare && !hasSpokenRef.current.firstCapture) {
      hasSpokenRef.current.firstCapture = true;
      queueMicrotask(() => speak("capture"));
      incrementMoveCount();
      return;
    }

    if (status === "check" && !hasSpokenRef.current.firstCheck) {
      hasSpokenRef.current.firstCheck = true;
      queueMicrotask(() => speak("check"));
      incrementMoveCount();
      return;
    }

    if (moveCount > 0 && moveCount % 2 === 0 && !hasCooldown()) {
      if (isAITurn && shouldSpeak()) {
        queueMicrotask(() => speak("opponentMove"));
        incrementMoveCount();
      } else if (!isAITurn && moveCount > 2 && shouldSpeak()) {
        queueMicrotask(() => speak("playerMove"));
        incrementMoveCount();
      }
    }
  }, [state.game, inMatch, isAITurn, state.lastCaptureSquare, speak]);

  function cancelAI() {
    ++aiRequestRef.current;
    aiControllerRef.current?.abort();
    aiControllerRef.current = null;
    setIsAIThinking(false);
    setAIError(false);
  }

  function cancelAnimation() {
    animationRef.current?.kill();
    animationRef.current = null;
    pendingMoveRef.current = null;
    setPendingAnimation(null);
  }

  function handleSelectOpponent(id) {
    setSelectedOpponentId(id);
    if (!hasPlayerProfile) {
      setStep("setup");
      return;
    }

    const opponent = opponents.find((candidate) => candidate.id === id);
    dispatch({ type: "RESET" });
    resetDialogueState();
    hasSpokenRef.current = { intro: true, firstCapture: false, firstCheck: false };
    setDialogueText(null);
    setStep("match");
    setTimeout(() => speak("intro", opponent), 600);
  }

  function handlePlayerSetup(playerData) {
    setPlayer(playerData);
    setHasPlayerProfile(true);
    savePlayer(playerData);
    setStep("match");
    resetDialogueState();
    hasSpokenRef.current = { intro: false, firstCapture: false, firstCheck: false };
    setDialogueText(null);
    dispatch({ type: "RESET" });
    setTimeout(() => {
      speak("intro");
      hasSpokenRef.current.intro = true;
    }, 600);
  }

  function handlePlayerSettings(playerData) {
    setPlayer(playerData);
    setHasPlayerProfile(true);
    savePlayer(playerData);
    setIsPlayerSettingsOpen(false);
  }

  function handleReset() {
    cancelAI();
    cancelAnimation();
    dispatch({ type: "RESET" });
    hasSpokenRef.current = { intro: false, firstCapture: false, firstCheck: false };
    setDialogueText(null);
    setGameResult(null);
    resetDialogueState();
  }

  function handleUndo() {
    cancelAI();
    cancelAnimation();
    const count =
      state.game.turn === "white" && state.snapshots.length >= 2 ? 2 : 1;
    dispatch({ type: "UNDO", count });
  }

  function handleDifficultyChange(nextDifficulty) {
    cancelAI();
    setDifficulty(nextDifficulty);
  }

  function handleThemeChange(nextTheme) {
    setTheme(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {}
  }

  function handleBackToSelection() {
    cancelAI();
    cancelAnimation();
    setSelectedOpponentId(null);
    setDialogueText(null);
    setIsPlayerSettingsOpen(false);
    setIsHistoryOpen(false);
    setIsSettingsOpen(false);
    setStep("select");
    resetDialogueState();
    dispatch({ type: "RESET" });
    clearSavedGame();
  }

  return (
    <div className={`flex min-h-dvh flex-col text-[#171713] theme-${theme}${isHudVisible && inMatch ? "" : " hud-hidden"}`}>
      {inMatch && (
        <Header
          game={state.game}
          aiStatus={aiStatus}
          difficulty={difficulty}
          theme={theme}
          canUndo={canUndo}
          isHistoryOpen={isHistoryOpen}
          isSettingsOpen={isSettingsOpen}
          inMatch={inMatch}
          onDifficultyChange={handleDifficultyChange}
          onThemeChange={handleThemeChange}
          onUndo={handleUndo}
          onReset={handleReset}
          onToggleHistory={() => {
            setIsSettingsOpen(false);
            setIsHistoryOpen((open) => !open);
          }}
          onToggleSettings={() => {
            setIsHistoryOpen(false);
            setIsSettingsOpen((open) => !open);
          }}
          onChangeOpponent={handleBackToSelection}
          onEditPlayer={() => {
            setIsSettingsOpen(false);
            setIsPlayerSettingsOpen(true);
          }}
        />
      )}

      {step === "select" && (
        <main className="flex flex-1 items-center justify-center px-3 py-4 sm:px-6">
          <OpponentSelect onStart={handleSelectOpponent} />
        </main>
      )}

      {step === "setup" && (
        <main className="flex flex-1 items-center justify-center px-3 py-4 sm:px-6">
          <PlayerSetup onComplete={handlePlayerSetup} />
        </main>
      )}

      {step === "match" && selectedOpponent && (
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-3 py-4 sm:px-6">
          <div className="board-area board-width">
            <div className="board-area__profile board-area__profile--top">
              <div className="board-area__portrait">
                <img
                  src={selectedOpponent.portrait}
                  alt={selectedOpponent.name}
                  width={32}
                  height={32}
                  className="board-area__img"
                />
              </div>
              <div className="board-area__info">
                <span className="board-area__name">{selectedOpponent.name}</span>
                {dialogueText && (
                  <span className="board-area__dialogue">{dialogueText}</span>
                )}
              </div>
            </div>

            <section className="board-area__board" aria-label="Player versus AI chess game">
              <ChessBoard
                ref={boardRef}
                game={state.game}
                selectedSquare={state.selectedSquare}
                legalMoves={state.legalMoves}
                isInputLocked={!canPlayerMove || Boolean(pendingAnimation)}
                onSelect={(index) => {
                  if (canPlayerMove && !pendingAnimation) dispatch({ type: "SELECT", index });
                }}
                animatingFrom={pendingAnimation?.from}
                animatingTo={pendingAnimation?.to}
                animationPiece={pendingAnimation?.piece}
                captureSquare={state.lastCaptureSquare}
              />
            </section>

            <div className="board-area__profile board-area__profile--bottom">
              <span className="board-area__name">{player.name}</span>
              <div className="board-area__portrait">
                {player.portrait ? (
                  <img
                    src={player.portrait}
                    alt={player.name}
                    width={32}
                    height={32}
                    className="board-area__img"
                  />
                ) : (
                  DEFAULT_AVATAR
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      <footer className="site-footer px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
      </footer>

      {inMatch && (
        <button
          type="button"
          className="hud-toggle"
          aria-label={isHudVisible ? "Hide header and footer" : "Show header and footer"}
          onClick={() => setIsHudVisible((v) => !v)}
        >
          {isHudVisible ? (
            <svg viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="0" y="3" width="1" height="1" fill="#171713" />
              <rect x="1" y="2" width="1" height="1" fill="#171713" />
              <rect x="2" y="1" width="1" height="1" fill="#171713" />
              <rect x="3" y="1" width="1" height="1" fill="#171713" />
              <rect x="4" y="1" width="1" height="1" fill="#171713" />
              <rect x="5" y="1" width="1" height="1" fill="#171713" />
              <rect x="6" y="2" width="1" height="1" fill="#171713" />
              <rect x="7" y="3" width="1" height="1" fill="#171713" />
              <rect x="1" y="4" width="1" height="1" fill="#171713" />
              <rect x="2" y="4" width="1" height="1" fill="#171713" />
              <rect x="3" y="4" width="1" height="1" fill="#171713" />
              <rect x="4" y="4" width="1" height="1" fill="#171713" />
              <rect x="5" y="4" width="1" height="1" fill="#171713" />
              <rect x="6" y="4" width="1" height="1" fill="#171713" />
              <rect x="3" y="3" width="2" height="2" fill="#171713" />
              <rect x="0" y="5" width="1" height="1" fill="#171713" />
              <rect x="1" y="5" width="1" height="1" fill="#171713" />
              <rect x="2" y="5" width="1" height="1" fill="#171713" />
              <rect x="5" y="5" width="1" height="1" fill="#171713" />
              <rect x="6" y="5" width="1" height="1" fill="#171713" />
              <rect x="7" y="5" width="1" height="1" fill="#171713" />
              <rect x="3" y="6" width="1" height="1" fill="#171713" />
              <rect x="4" y="6" width="1" height="1" fill="#171713" />
            </svg>
          ) : (
            <svg viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="0" y="3" width="1" height="1" fill="#171713" />
              <rect x="1" y="2" width="1" height="1" fill="#171713" />
              <rect x="2" y="1" width="1" height="1" fill="#171713" />
              <rect x="3" y="1" width="1" height="1" fill="#171713" />
              <rect x="4" y="1" width="1" height="1" fill="#171713" />
              <rect x="5" y="1" width="1" height="1" fill="#171713" />
              <rect x="6" y="2" width="1" height="1" fill="#171713" />
              <rect x="7" y="3" width="1" height="1" fill="#171713" />
              <rect x="1" y="4" width="1" height="1" fill="#171713" />
              <rect x="2" y="4" width="1" height="1" fill="#171713" />
              <rect x="5" y="4" width="1" height="1" fill="#171713" />
              <rect x="6" y="4" width="1" height="1" fill="#171713" />
              <rect x="0" y="5" width="1" height="1" fill="#171713" />
              <rect x="1" y="5" width="1" height="1" fill="#171713" />
              <rect x="6" y="5" width="1" height="1" fill="#171713" />
              <rect x="7" y="5" width="1" height="1" fill="#171713" />
              <rect x="2" y="6" width="1" height="1" fill="#171713" />
              <rect x="3" y="6" width="1" height="1" fill="#171713" />
              <rect x="4" y="6" width="1" height="1" fill="#171713" />
              <rect x="5" y="6" width="1" height="1" fill="#171713" />
              <rect x="3" y="3" width="1" height="1" fill="#171713" />
              <rect x="4" y="3" width="1" height="1" fill="#171713" />
            </svg>
          )}
        </button>
      )}

      {state.pendingPromotion && (
        <PromotionModal
          color="white"
          onSelect={(piece) => dispatch({ type: "PROMOTE", piece })}
        />
      )}

      {gameResult && (
        <GameOverModal
          result={gameResult}
          opponentName={selectedOpponent?.name || "Opponent"}
          onNewGame={handleReset}
        />
      )}

      {isPlayerSettingsOpen && (
        <PlayerSetup
          initialPlayer={player}
          title="Player Settings"
          submitLabel="Save Profile"
          isModal
          onComplete={handlePlayerSettings}
          onCancel={() => setIsPlayerSettingsOpen(false)}
        />
      )}
    </div>
  );
}
