const FILES = "abcdefgh";
const PROMOTION_TYPES = ["queen", "rook", "bishop", "knight"];
const PIECE_LETTERS = {
  king: "K",
  queen: "Q",
  rook: "R",
  bishop: "B",
  knight: "N",
};

function piece(type, color) {
  return { type, color };
}

function opposite(color) {
  return color === "white" ? "black" : "white";
}

function rowOf(index) {
  return Math.floor(index / 8);
}

function columnOf(index) {
  return index % 8;
}

function onBoard(row, column) {
  return row >= 0 && row < 8 && column >= 0 && column < 8;
}

function normalizeSquare(square) {
  if (Number.isInteger(square) && square >= 0 && square < 64) return square;
  return algebraicToIndex(square);
}

export function algebraicToIndex(square) {
  if (typeof square !== "string" || !/^[a-h][1-8]$/.test(square)) return -1;
  return (8 - Number(square[1])) * 8 + FILES.indexOf(square[0]);
}

export function indexToAlgebraic(index) {
  if (!Number.isInteger(index) || index < 0 || index >= 64) return null;
  return `${FILES[columnOf(index)]}${8 - rowOf(index)}`;
}

function initialBoard() {
  const board = Array(64).fill(null);
  const backRank = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];

  for (let column = 0; column < 8; column += 1) {
    board[column] = piece(backRank[column], "black");
    board[8 + column] = piece("pawn", "black");
    board[48 + column] = piece("pawn", "white");
    board[56 + column] = piece(backRank[column], "white");
  }

  return board;
}

function initialCastlingRights() {
  return {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true },
  };
}

export function createPositionKey(state) {
  const symbols = {
    pawn: "p",
    knight: "n",
    bishop: "b",
    rook: "r",
    queen: "q",
    king: "k",
  };
  const placement = state.board
    .map((current) => {
      if (!current) return ".";
      const symbol = symbols[current.type] || "?";
      return current.color === "white" ? symbol.toUpperCase() : symbol;
    })
    .join("");
  const rights = [
    state.castlingRights?.white?.kingSide ? "K" : "",
    state.castlingRights?.white?.queenSide ? "Q" : "",
    state.castlingRights?.black?.kingSide ? "k" : "",
    state.castlingRights?.black?.queenSide ? "q" : "",
  ].join("") || "-";
  const enPassant = indexToAlgebraic(effectiveEnPassantTarget(state)) || "-";

  return `${placement} ${state.turn} ${rights} ${enPassant}`;
}

function effectiveEnPassantTarget(state) {
  const target = state.enPassantTarget;
  if (!Number.isInteger(target) || target < 0 || target >= 64 || state.board[target]) return null;
  const targetRow = rowOf(target);
  const targetColumn = columnOf(target);
  const sourceRow = targetRow + (state.turn === "white" ? 1 : -1);
  const capturedIndex = sourceRow * 8 + targetColumn;
  const captured = state.board[capturedIndex];
  if (captured?.type !== "pawn" || captured.color !== opposite(state.turn)) return null;

  for (const sourceColumn of [targetColumn - 1, targetColumn + 1]) {
    if (!onBoard(sourceRow, sourceColumn)) continue;
    const from = sourceRow * 8 + sourceColumn;
    const pawn = state.board[from];
    if (pawn?.type !== "pawn" || pawn.color !== state.turn) continue;
    const move = { from, to: target, captured, capturedIndex, isEnPassant: true };
    if (!isKingInCheck(boardAfterMove(state.board, move), state.turn)) return target;
  }
  return null;
}

export function createInitialGameState() {
  const state = {
    board: initialBoard(),
    turn: "white",
    castlingRights: initialCastlingRights(),
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
  };
  state.positionCounts[createPositionKey(state)] = 1;
  return state;
}

function isSquareAttacked(board, square, byColor) {
  const row = rowOf(square);
  const column = columnOf(square);
  const pawnSourceRow = row + (byColor === "white" ? 1 : -1);

  for (const deltaColumn of [-1, 1]) {
    const sourceColumn = column + deltaColumn;
    if (onBoard(pawnSourceRow, sourceColumn)) {
      const attacker = board[pawnSourceRow * 8 + sourceColumn];
      if (attacker?.color === byColor && attacker.type === "pawn") return true;
    }
  }

  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [deltaRow, deltaColumn] of knightOffsets) {
    const sourceRow = row + deltaRow;
    const sourceColumn = column + deltaColumn;
    if (!onBoard(sourceRow, sourceColumn)) continue;
    const attacker = board[sourceRow * 8 + sourceColumn];
    if (attacker?.color === byColor && attacker.type === "knight") return true;
  }

  const rays = [
    [-1, 0, "rook", "queen"], [1, 0, "rook", "queen"],
    [0, -1, "rook", "queen"], [0, 1, "rook", "queen"],
    [-1, -1, "bishop", "queen"], [-1, 1, "bishop", "queen"],
    [1, -1, "bishop", "queen"], [1, 1, "bishop", "queen"],
  ];
  for (const [deltaRow, deltaColumn, firstType, secondType] of rays) {
    let sourceRow = row + deltaRow;
    let sourceColumn = column + deltaColumn;
    while (onBoard(sourceRow, sourceColumn)) {
      const attacker = board[sourceRow * 8 + sourceColumn];
      if (attacker) {
        if (attacker.color === byColor && (attacker.type === firstType || attacker.type === secondType)) {
          return true;
        }
        break;
      }
      sourceRow += deltaRow;
      sourceColumn += deltaColumn;
    }
  }

  for (let deltaRow = -1; deltaRow <= 1; deltaRow += 1) {
    for (let deltaColumn = -1; deltaColumn <= 1; deltaColumn += 1) {
      if (deltaRow === 0 && deltaColumn === 0) continue;
      const sourceRow = row + deltaRow;
      const sourceColumn = column + deltaColumn;
      if (!onBoard(sourceRow, sourceColumn)) continue;
      const attacker = board[sourceRow * 8 + sourceColumn];
      if (attacker?.color === byColor && attacker.type === "king") return true;
    }
  }

  return false;
}

export function isKingInCheck(board, color) {
  const king = board.findIndex((current) => current?.type === "king" && current.color === color);
  return king !== -1 && isSquareAttacked(board, king, opposite(color));
}

function addStepMove(moves, state, from, row, column) {
  if (!onBoard(row, column)) return;
  const target = state.board[row * 8 + column];
  if (!target || (target.color !== state.turn && target.type !== "king")) {
    moves.push({ from, to: row * 8 + column, captured: target || null });
  }
}

function addSlidingMoves(moves, state, from, directions) {
  const startRow = rowOf(from);
  const startColumn = columnOf(from);
  for (const [deltaRow, deltaColumn] of directions) {
    let row = startRow + deltaRow;
    let column = startColumn + deltaColumn;
    while (onBoard(row, column)) {
      const to = row * 8 + column;
      const target = state.board[to];
      if (!target) {
        moves.push({ from, to, captured: null });
      } else {
        if (target.color !== state.turn && target.type !== "king") {
          moves.push({ from, to, captured: target });
        }
        break;
      }
      row += deltaRow;
      column += deltaColumn;
    }
  }
}

function addPawnMove(moves, move, promotionRow) {
  if (rowOf(move.to) !== promotionRow) {
    moves.push(move);
    return;
  }
  for (const promotion of PROMOTION_TYPES) moves.push({ ...move, promotion });
}

function canCastle(state, color, side) {
  if (!state.castlingRights?.[color]?.[side]) return false;
  const row = color === "white" ? 7 : 0;
  const kingFrom = row * 8 + 4;
  const rookFrom = row * 8 + (side === "kingSide" ? 7 : 0);
  const king = state.board[kingFrom];
  const rook = state.board[rookFrom];
  if (king?.type !== "king" || king.color !== color || rook?.type !== "rook" || rook.color !== color) return false;

  const emptyColumns = side === "kingSide" ? [5, 6] : [1, 2, 3];
  if (emptyColumns.some((column) => state.board[row * 8 + column])) return false;
  if (isKingInCheck(state.board, color)) return false;

  const transit = row * 8 + (side === "kingSide" ? 5 : 3);
  const transitBoard = state.board.slice();
  transitBoard[transit] = transitBoard[kingFrom];
  transitBoard[kingFrom] = null;
  return !isKingInCheck(transitBoard, color);
}

function pseudoMoves(state, from) {
  const current = state.board[from];
  if (!current || current.color !== state.turn) return [];
  const moves = [];
  const row = rowOf(from);
  const column = columnOf(from);

  if (current.type === "pawn") {
    const direction = current.color === "white" ? -1 : 1;
    const startRow = current.color === "white" ? 6 : 1;
    const promotionRow = current.color === "white" ? 0 : 7;
    const oneRow = row + direction;
    if (onBoard(oneRow, column) && !state.board[oneRow * 8 + column]) {
      addPawnMove(moves, { from, to: oneRow * 8 + column, captured: null }, promotionRow);
      const twoRow = row + direction * 2;
      if (row === startRow && !state.board[twoRow * 8 + column]) {
        moves.push({ from, to: twoRow * 8 + column, captured: null, doublePawnPush: true });
      }
    }
    for (const deltaColumn of [-1, 1]) {
      const targetRow = row + direction;
      const targetColumn = column + deltaColumn;
      if (!onBoard(targetRow, targetColumn)) continue;
      const to = targetRow * 8 + targetColumn;
      const target = state.board[to];
      if (target && target.color !== current.color && target.type !== "king") {
        addPawnMove(moves, { from, to, captured: target }, promotionRow);
      } else if (to === state.enPassantTarget) {
        const capturedIndex = row * 8 + targetColumn;
        const captured = state.board[capturedIndex];
        if (captured?.type === "pawn" && captured.color === opposite(current.color)) {
          moves.push({ from, to, captured, capturedIndex, isEnPassant: true });
        }
      }
    }
  } else if (current.type === "knight") {
    for (const [deltaRow, deltaColumn] of [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ]) addStepMove(moves, state, from, row + deltaRow, column + deltaColumn);
  } else if (current.type === "bishop") {
    addSlidingMoves(moves, state, from, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
  } else if (current.type === "rook") {
    addSlidingMoves(moves, state, from, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
  } else if (current.type === "queen") {
    addSlidingMoves(moves, state, from, [
      [-1, -1], [-1, 1], [1, -1], [1, 1],
      [-1, 0], [1, 0], [0, -1], [0, 1],
    ]);
  } else if (current.type === "king") {
    for (let deltaRow = -1; deltaRow <= 1; deltaRow += 1) {
      for (let deltaColumn = -1; deltaColumn <= 1; deltaColumn += 1) {
        if (deltaRow !== 0 || deltaColumn !== 0) {
          addStepMove(moves, state, from, row + deltaRow, column + deltaColumn);
        }
      }
    }
    if (canCastle(state, current.color, "kingSide")) {
      moves.push({ from, to: row * 8 + 6, captured: null, isCastle: "kingSide" });
    }
    if (canCastle(state, current.color, "queenSide")) {
      moves.push({ from, to: row * 8 + 2, captured: null, isCastle: "queenSide" });
    }
  }

  return moves;
}

function boardAfterMove(board, move) {
  const next = board.slice();
  const movingPiece = next[move.from];
  next[move.from] = null;
  if (move.isEnPassant) next[move.capturedIndex] = null;
  next[move.to] = move.promotion ? piece(move.promotion, movingPiece.color) : movingPiece;

  if (move.isCastle) {
    const row = rowOf(move.from);
    const rookFrom = row * 8 + (move.isCastle === "kingSide" ? 7 : 0);
    const rookTo = row * 8 + (move.isCastle === "kingSide" ? 5 : 3);
    next[rookTo] = next[rookFrom];
    next[rookFrom] = null;
  }
  return next;
}

export function getLegalMoveDetails(state, from) {
  const fromIndex = normalizeSquare(from);
  if (fromIndex === -1 || !Array.isArray(state?.board) || state.board.length !== 64) return [];
  if (state.status && state.status !== "playing" && state.status !== "check") return [];
  return pseudoMoves(state, fromIndex).filter((move) => {
    const board = boardAfterMove(state.board, move);
    return !isKingInCheck(board, state.turn);
  });
}

export function getLegalMoves(state, from) {
  return [...new Set(getLegalMoveDetails(state, from).map((move) => move.to))];
}

function allLegalMoves(state) {
  const moves = [];
  for (let from = 0; from < 64; from += 1) {
    if (state.board[from]?.color === state.turn) moves.push(...getLegalMoveDetails(state, from));
  }
  return moves;
}

function updatedCastlingRights(state, move, movingPiece) {
  const rights = {
    white: { ...state.castlingRights?.white },
    black: { ...state.castlingRights?.black },
  };
  if (movingPiece.type === "king") {
    rights[movingPiece.color].kingSide = false;
    rights[movingPiece.color].queenSide = false;
  }

  const corners = {
    0: ["black", "queenSide"],
    7: ["black", "kingSide"],
    56: ["white", "queenSide"],
    63: ["white", "kingSide"],
  };
  if (movingPiece.type === "rook" && corners[move.from]) {
    const [color, side] = corners[move.from];
    rights[color][side] = false;
  }
  if (move.captured?.type === "rook" && corners[move.to]) {
    const [color, side] = corners[move.to];
    rights[color][side] = false;
  }
  return rights;
}

function isInsufficientMaterial(board) {
  const nonKings = [];
  for (let index = 0; index < 64; index += 1) {
    const current = board[index];
    if (current && current.type !== "king") nonKings.push({ ...current, index });
  }
  if (nonKings.length === 0) return true;
  if (nonKings.length === 1) return ["bishop", "knight"].includes(nonKings[0].type);
  if (nonKings.every((current) => current.type === "bishop")) {
    return nonKings.every((current) =>
      (rowOf(current.index) + columnOf(current.index)) % 2 ===
      (rowOf(nonKings[0].index) + columnOf(nonKings[0].index)) % 2
    );
  }
  return false;
}

export function evaluateGameStatus(state) {
  const inCheck = isKingInCheck(state.board, state.turn);
  const legalMoves = allLegalMoves({ ...state, status: "playing" });
  if (legalMoves.length === 0) {
    if (inCheck) return { status: "checkmate", winner: opposite(state.turn), drawReason: null };
    return { status: "stalemate", winner: null, drawReason: "stalemate" };
  }
  if (isInsufficientMaterial(state.board)) {
    return { status: "draw", winner: null, drawReason: "insufficient-material" };
  }
  if (state.halfmoveClock >= 100) {
    return { status: "draw", winner: null, drawReason: "fifty-move-rule" };
  }
  if ((state.positionCounts?.[createPositionKey(state)] || 0) >= 3) {
    return { status: "draw", winner: null, drawReason: "threefold-repetition" };
  }
  return { status: inCheck ? "check" : "playing", winner: null, drawReason: null };
}

function sanForMove(state, move, movingPiece, result) {
  let notation;
  if (move.isCastle) {
    notation = move.isCastle === "kingSide" ? "O-O" : "O-O-O";
  } else {
    const capture = Boolean(move.captured);
    if (movingPiece.type === "pawn") {
      notation = `${capture ? FILES[columnOf(move.from)] : ""}${capture ? "x" : ""}${indexToAlgebraic(move.to)}`;
    } else {
      const alternatives = allLegalMoves({ ...state, status: "playing" }).filter((candidate) =>
        candidate.from !== move.from &&
        candidate.to === move.to &&
        state.board[candidate.from]?.type === movingPiece.type
      );
      let disambiguation = "";
      if (alternatives.length > 0) {
        const sameFile = alternatives.some((candidate) => columnOf(candidate.from) === columnOf(move.from));
        const sameRank = alternatives.some((candidate) => rowOf(candidate.from) === rowOf(move.from));
        if (!sameFile) disambiguation = FILES[columnOf(move.from)];
        else if (!sameRank) disambiguation = String(8 - rowOf(move.from));
        else disambiguation = indexToAlgebraic(move.from);
      }
      notation = `${PIECE_LETTERS[movingPiece.type]}${disambiguation}${capture ? "x" : ""}${indexToAlgebraic(move.to)}`;
    }
    if (move.promotion) notation += `=${PIECE_LETTERS[move.promotion]}`;
  }
  if (result.status === "checkmate") notation += "#";
  else if (isKingInCheck(boardAfterMove(state.board, move), opposite(movingPiece.color))) notation += "+";
  return notation;
}

export function makeMove(state, from, to, promotion) {
  const fromIndex = normalizeSquare(from);
  const toIndex = normalizeSquare(to);
  if (fromIndex === -1 || toIndex === -1) return state;
  if (promotion !== undefined && !PROMOTION_TYPES.includes(promotion)) return state;

  const legal = getLegalMoveDetails(state, fromIndex).filter((move) => move.to === toIndex);
  if (legal.length === 0) return state;
  const requiresPromotion = legal.some((move) => move.promotion);
  if (requiresPromotion && !PROMOTION_TYPES.includes(promotion)) return state;
  if (!requiresPromotion && promotion !== undefined) return state;
  const move = legal.find((candidate) => candidate.promotion === promotion);
  if (!move) return state;

  const movingPiece = state.board[fromIndex];
  const board = boardAfterMove(state.board, move);
  const next = {
    ...state,
    board,
    turn: opposite(state.turn),
    castlingRights: updatedCastlingRights(state, move, movingPiece),
    enPassantTarget: move.doublePawnPush ? (fromIndex + toIndex) / 2 : null,
    halfmoveClock: movingPiece.type === "pawn" || move.captured ? 0 : state.halfmoveClock + 1,
    fullmoveNumber: state.fullmoveNumber + (state.turn === "black" ? 1 : 0),
    status: "playing",
    winner: null,
    drawReason: null,
    capturedPieces: move.captured
      ? [...state.capturedPieces, { ...move.captured }]
      : [...state.capturedPieces],
    positionCounts: { ...state.positionCounts },
  };
  const key = createPositionKey(next);
  next.positionCounts[key] = (next.positionCounts[key] || 0) + 1;
  const result = evaluateGameStatus(next);
  Object.assign(next, result);

  const record = {
    from: fromIndex,
    to: toIndex,
    fromSquare: indexToAlgebraic(fromIndex),
    toSquare: indexToAlgebraic(toIndex),
    piece: movingPiece.type,
    color: movingPiece.color,
    captured: move.captured ? { ...move.captured } : null,
    promotion: move.promotion || null,
    isCastle: Boolean(move.isCastle),
    castleSide: move.isCastle || null,
    isEnPassant: Boolean(move.isEnPassant),
    notation: sanForMove(state, move, movingPiece, result),
  };
  next.lastMove = record;
  next.moveHistory = [...state.moveHistory, record];
  return next;
}

export { PROMOTION_TYPES };
