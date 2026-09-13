import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function OpponentDialogue({ opponent, text }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!text || !boxRef.current) return;
    gsap.fromTo(
      boxRef.current,
      { opacity: 0, y: 3 },
      { opacity: 1, y: 0, duration: 0.15, ease: "power2.out" },
    );
  }, [text]);

  return (
    <div className="opponent-dialogue" aria-live="polite">
      <div className="opponent-dialogue__portrait">
        <img
          src={opponent.portrait}
          alt={opponent.name}
          width={32}
          height={32}
          className="opponent-dialogue__img"
        />
      </div>
      {text && (
        <div className="opponent-dialogue__box" ref={boxRef}>
          <span className="opponent-dialogue__name">{opponent.name}</span>
          <p className="opponent-dialogue__text">{text}</p>
        </div>
      )}
    </div>
  );
}
