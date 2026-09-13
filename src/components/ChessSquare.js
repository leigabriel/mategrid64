import ChessPiece from "@/components/ChessPiece";

export default function ChessSquare({
  index,
  file,
  rank,
  tone,
  piece,
  isSelected,
  isLegal,
  isCapture,
  isLastMove,
  isCheck,
  isCaptureFlash,
  isAnimatingFrom,
  onSelect,
}) {
  const states = [
    isSelected && "is-selected",
    isLegal && "is-legal",
    isCapture && "is-capture",
    isLastMove && "is-last-move",
    isCheck && "is-check",
    isCaptureFlash && "is-capture-flash",
  ]
    .filter(Boolean)
    .join(" ");
  const label = `${file}${rank}, ${piece ? `${piece.color} ${piece.type}` : "empty"}${
    isLegal ? isCapture ? ", legal capture" : ", legal move" : ""
  }${isCheck ? ", in check" : ""}`;

  return (
    <button
      type="button"
      className={`chess-square chess-square--${tone} ${states}`}
      data-chess-square
      data-square={index}
      aria-label={label}
      aria-pressed={isSelected}
      onClick={() => onSelect(index)}
    >
      {piece && !isAnimatingFrom && (
        <span className="piece-holder" data-piece-color={piece.color} aria-hidden="true">
          <ChessPiece type={piece.type} color={piece.color} />
        </span>
      )}
    </button>
  );
}
