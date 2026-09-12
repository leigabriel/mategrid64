import ChessPiece from "@/components/ChessPiece";

export default function ChessSquare({
  index,
  file,
  rank,
  tone,
  showFile,
  showRank,
  piece,
  introOrder,
  isIntroActive,
  isSelected,
  isLegal,
  isCapture,
  isLastMove,
  isCheck,
  onSelect,
}) {
  const states = [
    isSelected && "is-selected",
    isLegal && "is-legal",
    isCapture && "is-capture",
    isLastMove && "is-last-move",
    isCheck && "is-check",
  ]
    .filter(Boolean)
    .join(" ");
  const label = `${file}${rank}, ${piece ? `${piece.color} ${piece.type}` : "empty"}${
    isLegal ? isCapture ? ", legal capture" : ", legal move" : ""
  }${isCheck ? ", in check" : ""}`;

  return (
    <button
      type="button"
      className={`chess-square chess-square--${tone} ${states} ${
        isIntroActive ? "chess-square-intro" : ""
      }`}
      style={{ "--square-delay": `${(8 - rank) * 25}ms` }}
      aria-label={label}
      aria-pressed={isSelected}
      onClick={() => onSelect(index)}
    >
      {piece && (
        <span
          className={`piece-holder ${
            isIntroActive
              ? `chess-piece-intro chess-piece-intro-${piece.color}`
              : ""
          }`}
          style={{ "--piece-delay": `${300 + introOrder * 20}ms` }}
          aria-hidden="true"
        >
          <ChessPiece type={piece.type} color={piece.color} />
        </span>
      )}
      {showRank && (
        <span className="coordinate coordinate--rank" aria-hidden="true">
          {rank}
        </span>
      )}
      {showFile && (
        <span className="coordinate coordinate--file" aria-hidden="true">
          {file}
        </span>
      )}
    </button>
  );
}
