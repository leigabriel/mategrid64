import { useRef, useState, useEffect } from "react";

const STORAGE_KEY = "mategrid-player-name";

function pixelateImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function PlayerSetup({
  onComplete,
  onCancel,
  initialPlayer = null,
  title = "Your Profile",
  submitLabel = "Start Match",
  isModal = false,
}) {
  const [name, setName] = useState(initialPlayer?.name || "");
  const [portrait, setPortrait] = useState(initialPlayer?.portrait || null);
  const [preview, setPreview] = useState(initialPlayer?.portrait || null);
  const fileRef = useRef(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (active && saved && !initialPlayer?.name) setName(saved);
    });

    return () => {
      active = false;
    };
  }, [initialPlayer?.name]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const pixelated = await pixelateImage(file);
    setPortrait(pixelated);
    setPreview(pixelated);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const playerName = name.trim() || "Player";
    localStorage.setItem(STORAGE_KEY, playerName);
    onComplete({ name: playerName, portrait });
  }

  return (
    <div
      className={`player-setup-overlay${isModal ? " player-settings-overlay" : ""}`}
      role={isModal ? "dialog" : undefined}
      aria-modal={isModal || undefined}
      aria-label={isModal ? title : undefined}
    >
      <form className="player-setup" onSubmit={handleSubmit}>
        <h2 className="player-setup__title">{title}</h2>

        <button
          type="button"
          className="player-setup__avatar"
          onClick={() => fileRef.current?.click()}
          aria-label="Upload profile picture"
        >
          {preview ? (
            <img
              src={preview}
              alt="Your profile"
              width={64}
              height={64}
              className="player-setup__preview"
            />
          ) : (
            <span className="player-setup__placeholder">+</span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
        />

        <input
          type="text"
          className="player-setup__name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoFocus
        />

        <button type="submit" className="pixel-button">
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="pixel-button pixel-button--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}
