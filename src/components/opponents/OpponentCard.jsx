import Image from "next/image";

export default function OpponentCard({ opponent, onSelect }) {
  return (
    <button
      type="button"
      className="opponent-card"
      onClick={() => onSelect(opponent.id)}
      aria-label={`Select ${opponent.name}`}
    >
      <div className="opponent-card__portrait">
        <Image
          src={opponent.portrait}
          alt={`${opponent.name} portrait`}
          width={64}
          height={64}
          unoptimized
          className="opponent-card__img"
        />
      </div>
      <span className="opponent-card__name">{opponent.name}</span>
    </button>
  );
}
