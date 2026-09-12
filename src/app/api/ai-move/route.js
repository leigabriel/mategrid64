import { NextResponse } from "next/server";

const uciPattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const temperatures = { easy: 0.8, medium: 0.35, hard: 0.05 };

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI unavailable. Add GEMINI_API_KEY to .env." },
      { status: 503 },
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { fen, legalMoves, difficulty = "medium" } = payload;
  const validMoves = Array.isArray(legalMoves)
    ? [...new Set(legalMoves.filter((move) => uciPattern.test(move)))].slice(0, 256)
    : [];
  if (
    typeof fen !== "string" ||
    fen.length > 120 ||
    /[\r\n]/.test(fen) ||
    validMoves.length === 0
  ) {
    return NextResponse.json({ error: "Invalid chess position." }, { status: 400 });
  }

  const models = ["gemini-2.5-flash", "gemini-3.6-flash"];
  const prompt = [
    "You are choosing one move in a chess game.",
    `Position (FEN): ${fen}`,
    `Legal UCI moves: ${validMoves.join(" ")}`,
    `Difficulty: ${difficulty}.`,
    "Return exactly one move from the legal list and no other text.",
  ].join("\n");
  try {
    let lastError = "AI service unavailable.";
    for (const model of models) {
      const generationConfig = {
        temperature: temperatures[difficulty] ?? temperatures.medium,
        maxOutputTokens: model === "gemini-2.5-flash" ? 64 : 256,
      };
      if (model === "gemini-2.5-flash") {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        lastError = failure.error?.message || lastError;
        if (/no longer available|not found/i.test(lastError)) continue;
        return NextResponse.json({ error: lastError }, { status: 502 });
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const move = text.toLowerCase().match(/[a-h][1-8][a-h][1-8][qrbn]?/)?.[0];
      if (!move || !validMoves.includes(move)) {
        return NextResponse.json(
          { error: "AI returned no legal move." },
          { status: 502 },
        );
      }
      return NextResponse.json({ move, model });
    }
    return NextResponse.json({ error: lastError }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "AI request timed out." }, { status: 504 });
  }
}
