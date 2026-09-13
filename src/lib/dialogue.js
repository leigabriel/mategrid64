let lastDialogue = null;
let moveCountSinceDialogue = 0;

export function getRandomIntro(opponent) {
  return getRandomDialogue(opponent, "intro");
}

export function getRandomDialogue(opponent, category) {
  const pool = opponent?.dialogue?.[category];
  if (!pool || pool.length === 0) return null;

  const filtered = pool.filter((line) => line !== lastDialogue);
  const candidates = filtered.length > 0 ? filtered : pool;
  const line = candidates[Math.floor(Math.random() * candidates.length)];
  lastDialogue = line;
  moveCountSinceDialogue = 0;
  return line;
}

export function shouldSpeak() {
  return Math.random() < 0.22;
}

export function incrementMoveCount() {
  moveCountSinceDialogue += 1;
}

export function hasCooldown() {
  return moveCountSinceDialogue < 2;
}

export function resetDialogueState() {
  lastDialogue = null;
  moveCountSinceDialogue = 0;
}
