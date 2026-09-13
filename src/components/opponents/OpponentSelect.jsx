import { useState } from "react";
import Image from "next/image";
import OpponentCard from "@/components/opponents/OpponentCard";
import { opponents } from "@/lib/opponents";
import { getRandomIntro } from "@/lib/dialogue";

export default function OpponentSelect({ onStart }) {
  const [step, setStep] = useState("grid");
  const [selected, setSelected] = useState(null);
  const [greeting, setGreeting] = useState(null);

  function handleSelect(id) {
    const opp = opponents.find((o) => o.id === id);
    setSelected(opp);
    setGreeting(getRandomIntro(opp));
    setStep("confirm");
  }

  function handleConfirm() {
    onStart(selected.id);
  }

  function handleBack() {
    setStep("grid");
    setSelected(null);
    setGreeting(null);
  }

  if (step === "confirm" && selected) {
    return (
      <div className="opponent-confirm">
        <div className="opponent-confirm__portrait">
          <Image
            src={selected.portrait}
            alt={`${selected.name} portrait`}
            width={96}
            height={96}
            unoptimized
            className="opponent-confirm__img"
          />
        </div>
        <span className="opponent-confirm__name">{selected.name}</span>
        <div className="opponent-confirm__dialogue">
          <p className="opponent-confirm__text">{greeting}</p>
        </div>
        <div className="opponent-confirm__actions">
          <button
            type="button"
            className="pixel-button"
            onClick={handleConfirm}
          >
            Start Match
          </button>
          <button
            type="button"
            className="pixel-button pixel-button--secondary"
            onClick={handleBack}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="opponent-select">
      <h2 className="opponent-select__title">Choose Opponent</h2>
      <div className="opponent-select__grid">
        {opponents.map((opp) => (
          <OpponentCard key={opp.id} opponent={opp} onSelect={handleSelect} />
        ))}
      </div>
    </div>
  );
}
