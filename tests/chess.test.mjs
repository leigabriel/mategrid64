import test from "node:test";
import assert from "node:assert/strict";

import {
  algebraicToIndex,
  createInitialGameState,
  createPositionKey,
  evaluateGameStatus,
  getLegalMoves,
  indexToAlgebraic,
  makeMove,
} from "../src/lib/chess/game.js";
import { generateFEN } from "../src/lib/chess/fen.js";
import { getLegalUCIMoves } from "../src/lib/chess/ai.js";
import { parseUCIMove } from "../src/lib/chess/uci.js";

const at = algebraicToIndex;

function play(state, from, to, promotion) {
  const next = makeMove(state, from, to, promotion);
  assert.notStrictEqual(next, state, `${from}-${to} should be legal`);
  return next;
}

function position(pieces, turn = "white", extra = {}) {
  const board = Array(64).fill(null);
  for (const [square, type, color] of pieces) board[at(square)] = { type, color };
  const state = {
    board,
    turn,
    castlingRights: {
      white: { kingSide: false, queenSide: false },
      black: { kingSide: false, queenSide: false },
    },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    status: "playing",
    winner: null,
    drawReason: null,
    moveHistory: [],
    capturedPieces: [],
    lastMove: null,
    positionCounts: {},
    ...extra,
  };
  state.positionCounts = extra.positionCounts || { [createPositionKey(state)]: 1 };
  return state;
}

test("coordinate helpers map the board orientation and reject invalid values", () => {
  assert.equal(at("a8"), 0);
  assert.equal(at("h1"), 63);
  assert.equal(indexToAlgebraic(60), "e1");
  assert.equal(at("z9"), -1);
  assert.equal(indexToAlgebraic(64), null);
});

test("starting moves respect blocking and turn enforcement", () => {
  const state = createInitialGameState();
  assert.deepEqual(getLegalMoves(state, "e2").sort((a, b) => a - b), [at("e4"), at("e3")].sort((a, b) => a - b));
  assert.deepEqual(getLegalMoves(state, "a1"), []);
  assert.deepEqual(getLegalMoves(state, "e7"), []);
  assert.strictEqual(makeMove(state, "e7", "e5"), state);
});

test("fool's mate is checkmate and records SAN", () => {
  let state = createInitialGameState();
  state = play(state, "f2", "f3");
  state = play(state, "e7", "e5");
  state = play(state, "g2", "g4");
  state = play(state, "d8", "h4");
  assert.equal(state.status, "checkmate");
  assert.equal(state.winner, "black");
  assert.equal(state.lastMove.notation, "Qh4#");
  assert.deepEqual(getLegalMoves(state, "e1"), []);
});

test("castling moves the rook and is rejected through check", () => {
  const basePieces = [
    ["e1", "king", "white"], ["h1", "rook", "white"], ["a8", "king", "black"],
  ];
  const rights = {
    white: { kingSide: true, queenSide: false },
    black: { kingSide: false, queenSide: false },
  };
  let state = position(basePieces, "white", { castlingRights: rights });
  assert.ok(getLegalMoves(state, "e1").includes(at("g1")));
  state = play(state, "e1", "g1");
  assert.deepEqual(state.board[at("f1")], { type: "rook", color: "white" });
  assert.equal(state.board[at("h1")], null);
  assert.equal(state.lastMove.notation, "O-O");

  const attacked = position([...basePieces, ["f8", "rook", "black"]], "white", { castlingRights: rights });
  assert.ok(!getLegalMoves(attacked, "e1").includes(at("g1")));
  assert.strictEqual(makeMove(attacked, "e1", "g1"), attacked);
});

test("queenside castling moves the rook to the correct square", () => {
  const state = position([
    ["e1", "king", "white"], ["a1", "rook", "white"], ["h8", "king", "black"],
  ], "white", {
    castlingRights: {
      white: { kingSide: false, queenSide: true },
      black: { kingSide: false, queenSide: false },
    },
  });
  const castled = play(state, "e1", "c1");
  assert.deepEqual(castled.board[at("d1")], { type: "rook", color: "white" });
  assert.equal(castled.board[at("a1")], null);
  assert.equal(castled.lastMove.notation, "O-O-O");
});

test("piece movement, jumping, blocking, and captures follow standard rules", () => {
  let state = createInitialGameState();
  assert.deepEqual(
    getLegalMoves(state, "g1").sort((a, b) => a - b),
    [at("f3"), at("h3")].sort((a, b) => a - b),
  );
  assert.deepEqual(getLegalMoves(state, "c1"), []);
  assert.deepEqual(getLegalMoves(state, "d1"), []);

  state = play(state, "e2", "e4");
  state = play(state, "d7", "d5");
  assert.ok(getLegalMoves(state, "f1").includes(at("b5")));
  state = play(state, "e4", "d5");
  assert.deepEqual(state.lastMove.captured, { type: "pawn", color: "black" });
  assert.equal(state.capturedPieces.length, 1);
});

test("a pinned piece cannot expose its own king", () => {
  const state = position([
    ["e1", "king", "white"], ["e2", "rook", "white"],
    ["e8", "rook", "black"], ["a8", "king", "black"],
  ]);
  assert.ok(!getLegalMoves(state, "e2").includes(at("d2")));
  assert.strictEqual(makeMove(state, "e2", "d2"), state);
  assert.ok(getLegalMoves(state, "e2").includes(at("e8")));
});

test("en passant is available only on the immediate reply", () => {
  let state = position([
    ["e1", "king", "white"], ["e8", "king", "black"],
    ["e5", "pawn", "white"], ["d7", "pawn", "black"],
  ], "black");
  state = play(state, "d7", "d5");
  assert.ok(getLegalMoves(state, "e5").includes(at("d6")));
  const captured = play(state, "e5", "d6");
  assert.equal(captured.board[at("d5")], null);
  assert.equal(captured.lastMove.isEnPassant, true);

  state = play(state, "e1", "f1");
  state = play(state, "e8", "f8");
  assert.ok(!getLegalMoves(state, "e5").includes(at("d6")));
});

test("position keys include en passant only when it changes legal moves", () => {
  const noCapturer = position([
    ["e1", "king", "white"], ["e8", "king", "black"], ["d5", "pawn", "black"],
  ], "white", { enPassantTarget: at("d6") });
  assert.equal(createPositionKey(noCapturer), createPositionKey({ ...noCapturer, enPassantTarget: null }));

  const capturer = position([
    ["e1", "king", "white"], ["e8", "king", "black"],
    ["e5", "pawn", "white"], ["d5", "pawn", "black"],
  ], "white", { enPassantTarget: at("d6") });
  assert.notEqual(createPositionKey(capturer), createPositionKey({ ...capturer, enPassantTarget: null }));
});

test("promotion requires and accepts each valid piece choice", () => {
  for (const promotion of ["queen", "rook", "bishop", "knight"]) {
    const state = position([
      ["h1", "king", "white"], ["h8", "king", "black"], ["a7", "pawn", "white"],
    ]);
    assert.strictEqual(makeMove(state, "a7", "a8"), state);
    assert.strictEqual(makeMove(state, "a7", "a8", "king"), state);
    const promoted = play(state, "a7", "a8", promotion);
    assert.deepEqual(promoted.board[at("a8")], { type: promotion, color: "white" });
    assert.equal(promoted.lastMove.promotion, promotion);
  }
});

test("stalemate is detected", () => {
  const state = position([
    ["a8", "king", "black"], ["c6", "king", "white"], ["b6", "queen", "white"],
  ], "black");
  assert.deepEqual(evaluateGameStatus(state), {
    status: "stalemate", winner: null, drawReason: "stalemate",
  });
});

test("basic insufficient material is a draw", () => {
  const state = position([
    ["a1", "king", "white"], ["h8", "king", "black"], ["c1", "bishop", "white"],
  ]);
  assert.deepEqual(evaluateGameStatus(state), {
    status: "draw", winner: null, drawReason: "insufficient-material",
  });

  const sameColorBishops = position([
    ["a1", "king", "white"], ["h8", "king", "black"],
    ["c1", "bishop", "white"], ["f8", "bishop", "black"],
  ]);
  assert.equal(evaluateGameStatus(sameColorBishops).drawReason, "insufficient-material");
});

test("fifty-move rule triggers at 100 halfmoves", () => {
  const state = position([
    ["a1", "king", "white"], ["h8", "king", "black"],
    ["b1", "rook", "white"], ["g8", "rook", "black"],
  ], "white", { halfmoveClock: 99 });
  const result = play(state, "b1", "b2");
  assert.equal(result.status, "draw");
  assert.equal(result.drawReason, "fifty-move-rule");
});

test("threefold repetition is tracked by position", () => {
  let state = position([
    ["a1", "king", "white"], ["h8", "king", "black"],
    ["b1", "rook", "white"], ["g8", "rook", "black"],
  ]);
  for (let cycle = 0; cycle < 2; cycle += 1) {
    state = play(state, "b1", "b2");
    state = play(state, "g8", "g7");
    state = play(state, "b2", "b1");
    state = play(state, "g7", "g8");
  }
  assert.equal(state.status, "draw");
  assert.equal(state.drawReason, "threefold-repetition");
});

test("FEN generation encodes the initial position", () => {
  assert.equal(
    generateFEN(createInitialGameState()),
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  );
});

test("FEN generation tracks pawn moves and en passant expiration", () => {
  let state = play(createInitialGameState(), "e2", "e4");
  assert.equal(
    generateFEN(state),
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  );

  state = play(state, "g8", "f6");
  assert.equal(
    generateFEN(state),
    "rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2",
  );
});

test("FEN generation reflects castling rights and move counters", () => {
  let state = createInitialGameState();
  state = play(state, "h2", "h3");
  state = play(state, "a7", "a6");
  state = play(state, "h1", "h2");
  assert.match(generateFEN(state), / b Qkq - 1 2$/);
});

test("UCI parsing normalizes coordinates and promotions", () => {
  assert.deepEqual(parseUCIMove("e2e4"), {
    from: at("e2"), to: at("e4"), promotion: null,
  });
  assert.deepEqual(parseUCIMove("A7A8Q"), {
    from: at("a7"), to: at("a8"), promotion: "queen",
  });
  assert.deepEqual(parseUCIMove("h2h1N"), {
    from: at("h2"), to: at("h1"), promotion: "knight",
  });
});

test("UCI parsing rejects malformed moves and invalid promotions", () => {
  for (const input of ["e2", "e2e9", "i2e4", "e2-e4", "e7e8k", " e2e4", "e2e4 ", "", null]) {
    assert.equal(parseUCIMove(input), null);
  }
});

test("AI requests are constrained to complete legal UCI move lists", () => {
  const moves = getLegalUCIMoves(createInitialGameState());
  assert.equal(moves.length, 20);
  assert.ok(moves.includes("e2e4"));
  assert.ok(moves.includes("g1f3"));
  assert.ok(!moves.includes("e2e5"));
});
