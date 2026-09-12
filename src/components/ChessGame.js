"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { gsap } from "gsap";

import ChessBoard from "@/components/ChessBoard";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import PromotionModal from "@/components/PromotionModal";
import { requestGeminiMove } from "@/lib/chess/ai";
import {
  createInitialGameState,
  getLegalMoves,
  makeMove,
} from "@/lib/chess/game";
import { parseUCIMove } from "@/lib/chess/uci";

const pieceAssets = ["white", "black"].flatMap((color) =>
  ["king", "queen", "rook", "bishop", "knight", "pawn"].map(
    (piece) => `/pieces/${color}/${piece}.png`,
  ),
);

function initialInterfaceState() {
  return {
    game: createInitialGameState(),
    selectedSquare: null,
    legalMoves: [],
    pendingPromotion: null,
    snapshots: [],
  };
}

function completeMove(state, from, to, promotion) {
  const game = makeMove(state.game, from, to, promotion);
  if (game === state.game) return state;
  return {
    game,
    selectedSquare: null,
    legalMoves: [],
    pendingPromotion: null,
    snapshots: [...state.snapshots, state.game],
  };
}

function gameReducer(state, action) {
  if (action.type === "RESET") return initialInterfaceState();
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
    };
  }
  if (action.type === "PROMOTE" && state.pendingPromotion) {
    return completeMove(
      state,
      state.pendingPromotion.from,
      state.pendingPromotion.to,
      action.piece,
    );
  }
  if (action.type === "AI_MOVE") {
    return completeMove(state, action.from, action.to, action.promotion || undefined);
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
    return completeMove(state, state.selectedSquare, action.index);
  }
  return { ...state, selectedSquare: null, legalMoves: [] };
}

export default function ChessGame() {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    initialInterfaceState,
  );
  const [presentation, setPresentation] = useState("loading");
  const [difficulty, setDifficulty] = useState("medium");
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiError, setAIError] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const aiControllerRef = useRef(null);
  const aiRequestRef = useRef(0);
  const sceneRef = useRef(null);
  const loadingRef = useRef(null);
  const headerRef = useRef(null);
  const boardRef = useRef(null);

  useEffect(() => {
    let active = true;
    let minimumTimer;
    let context;
    let timeline;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    const minimumDelay = new Promise((resolve) =>
      (minimumTimer = window.setTimeout(resolve, 5000)),
    );
    const assets = Promise.all(
      pieceAssets.map(
        (src) =>
          new Promise((resolve) => {
            const image = new window.Image();
            image.onload = resolve;
            image.onerror = resolve;
            image.src = src;
            if (image.complete) resolve();
          }),
      ),
    );

    Promise.all([minimumDelay, assets]).then(() => {
      if (!active) return;
      if (reduceMotion) {
        setPresentation("ready");
        return;
      }

      setPresentation("intro");
      const root = sceneRef.current;
      const loading = loadingRef.current;
      const header = headerRef.current;
      const board = boardRef.current;
      const main = root?.querySelector("main");
      const squares = board?.querySelectorAll("[data-chess-square]") || [];
      const blackPieces =
        board?.querySelectorAll('[data-piece-color="black"]') || [];
      const whitePieces =
        board?.querySelectorAll('[data-piece-color="white"]') || [];
      const controls = root?.querySelectorAll("[data-intro-controls]") || [];

      context = gsap.context(() => {
        gsap.set(header, { y: -10, opacity: 0 });
        gsap.set(board, {
          y: isMobile ? 10 : 20,
          scale: isMobile ? 1.03 : 1.06,
          opacity: 0,
        });
        gsap.set(squares, { y: isMobile ? 2 : 4, opacity: 0 });
        gsap.set(blackPieces, { y: isMobile ? -8 : -14, opacity: 0 });
        gsap.set(whitePieces, { y: isMobile ? 8 : 14, opacity: 0 });
        gsap.set(controls, { y: 6, opacity: 0 });

        timeline = gsap.timeline({
          defaults: { ease: "power3.out" },
          onStart: () => gsap.set(main, { visibility: "visible" }),
          onComplete: () => {
            gsap.set([header, board, ...squares, ...blackPieces, ...whitePieces, ...controls], {
              clearProps: "transform,opacity,visibility",
            });
            if (active) setPresentation("ready");
          },
        });
        timeline
          .to(loading, { y: -6, opacity: 0, duration: 0.24 })
          .to(header, { y: 0, opacity: 1, duration: 0.3 }, 0.1)
          .to(board, { y: -3, scale: 1, opacity: 1, duration: 0.62 }, 0.16)
          .to(
            squares,
            { y: 0, opacity: 1, duration: 0.18, stagger: 0.008 },
            0.27,
          )
          .to(
            blackPieces,
            { y: 0, opacity: 1, duration: 0.25, stagger: 0.018 },
            0.5,
          )
          .to(
            whitePieces,
            { y: 0, opacity: 1, duration: 0.25, stagger: 0.018 },
            0.67,
          )
          .to(controls, { y: 0, opacity: 1, duration: 0.22 }, 0.9)
          .to(board, { y: 0, duration: 0.18 }, 1.08);
      }, sceneRef);
    });

    return () => {
      active = false;
      window.clearTimeout(minimumTimer);
      timeline?.kill();
      context?.revert();
    };
  }, []);

  const isLoading = presentation === "loading";
  const showLoading = presentation !== "ready";
  const isPresentationReady = presentation === "ready";
  const isAITurn =
    state.game.turn === "black" &&
    ["playing", "check"].includes(state.game.status);
  const canPlayerMove = isPresentationReady && !isAIThinking && !isAITurn;
  const aiStatus = aiError
    ? "error"
    : isAIThinking
      ? "thinking"
      : isAITurn
        ? "loading"
        : null;

  useEffect(() => {
    if (!isPresentationReady || !isAITurn || aiError) return;

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
  }, [aiError, difficulty, isAITurn, isPresentationReady, state.game]);

  function cancelAI() {
    ++aiRequestRef.current;
    aiControllerRef.current?.abort();
    aiControllerRef.current = null;
    setIsAIThinking(false);
    setAIError(false);
  }

  function handleReset() {
    if (!isPresentationReady) return;
    cancelAI();
    dispatch({ type: "RESET" });
  }

  function handleUndo() {
    if (!isPresentationReady) return;
    cancelAI();
    const count =
      state.game.turn === "white" && state.snapshots.length >= 2 ? 2 : 1;
    dispatch({ type: "UNDO", count });
  }

  function handleDifficultyChange(nextDifficulty) {
    cancelAI();
    setDifficulty(nextDifficulty);
  }

  return (
    <div ref={sceneRef} className="flex min-h-dvh flex-col bg-white text-[#171713]">
      {showLoading && <LoadingScreen screenRef={loadingRef} />}
      <Header
        headerRef={headerRef}
        game={state.game}
        aiStatus={aiStatus}
        difficulty={difficulty}
        canUndo={state.snapshots.length > 0 || Boolean(state.pendingPromotion)}
        isHistoryOpen={isHistoryOpen}
        onDifficultyChange={handleDifficultyChange}
        onUndo={handleUndo}
        onReset={handleReset}
        onToggleHistory={() => setIsHistoryOpen((open) => !open)}
      />

      <main
        className={`flex flex-1 items-center justify-center px-3 py-4 sm:px-6 ${
          isLoading ? "game-shell--waiting" : "game-shell--visible"
        }`}
        aria-hidden={isLoading}
      >
        <section className="board-width" aria-label="Player versus AI chess game">
          <ChessBoard
            boardRef={boardRef}
            game={state.game}
            selectedSquare={state.selectedSquare}
            legalMoves={state.legalMoves}
            isInputLocked={!canPlayerMove}
            onSelect={(index) => {
              if (canPlayerMove) dispatch({ type: "SELECT", index });
            }}
          />
        </section>
      </main>

      <footer className="site-footer px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <span>leimxnsquare</span>
        <span>version 1.0.0</span>
      </footer>

      {state.pendingPromotion && (
        <PromotionModal
          color="white"
          onSelect={(piece) => dispatch({ type: "PROMOTE", piece })}
        />
      )}
    </div>
  );
}
