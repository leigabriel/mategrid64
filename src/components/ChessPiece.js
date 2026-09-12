import Image from "next/image";

export default function ChessPiece({ type, color, alt = "" }) {
  return (
    <Image
      src={`/pieces/${color}/${type}.png`}
      alt={alt}
      width={64}
      height={64}
      draggable={false}
      unoptimized
      className="pixel-piece"
    />
  );
}
