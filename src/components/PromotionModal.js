import ChessPiece from "@/components/ChessPiece";

const choices = ["queen", "rook", "bishop", "knight"];

export default function PromotionModal({ color, onSelect }) {
  return (
    <div className="promotion-backdrop">
      <div
        className="promotion-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-title"
      >
        <p
          id="promotion-title"
          className="font-mono text-xs font-semibold uppercase tracking-[0.16em]"
        >
          Choose promotion
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {choices.map((piece) => (
            <button
              key={piece}
              type="button"
              className="promotion-choice"
              aria-label={`Promote to ${piece}`}
              onClick={() => onSelect(piece)}
            >
              <ChessPiece type={piece} color={color} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
