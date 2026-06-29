/**
 * Gemini (GenAI) client — thin key-gated wrapper around @google/genai for the
 * asset pipeline. Generation is opt-in: throws without a key, never silently
 * no-ops. Ported from the shared dev pipeline (martian-trails).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Nano Banana image models (latest, via generateContent — NOT Imagen's predict).
// They follow instructions precisely and output NATIVE TRANSPARENT PNGs when asked
// (outputMimeType image/png preserves the alpha the model paints for a "transparent
// background" prompt) — so props/NPCs are isolated at generation, NO chromakey.
//   - flash: gemini-3.1-flash-image (fast, great for props/NPCs/obstacles)
//   - pro:   gemini-3-pro-image (highest quality, for parallax/hero key-art)
export const IMAGE_MODEL_FLASH = "gemini-3.1-flash-image";
export const IMAGE_MODEL_PRO = "gemini-3-pro-image";
export const DEFAULT_IMAGE_MODEL = IMAGE_MODEL_FLASH;
// gemini-3.5-flash — the latest flash text model (confirmed via the live models
// list), for emitting the schema-conformant Level JSON.
export const DEFAULT_TEXT_MODEL = "gemini-3.5-flash";

/** Read GEMINI_API_KEY from env or the gitignored .env. */
export function readGeminiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return undefined;
  // Capture only a key-shaped token (no whitespace/newlines) and trim it.
  return readFileSync(envPath, "utf8")
    .match(/GEMINI_API_KEY=([A-Za-z0-9._-]+)/)?.[1]
    ?.trim();
}

/**
 * (prompt, opts?) → PNG bytes (Buffer) or null. Throws without a key. Uses a Nano
 * Banana model via generateContent with the researched imageConfig:
 *   - responseModalities ["IMAGE"]; the model returns a PNG whose ALPHA is preserved
 *     (native transparency when the prompt asks for a transparent background — no
 *     chromakey isolation needed). NOTE: outputMimeType / imageOutputOptions are
 *     Vertex/Enterprise-only and REJECTED by the Gemini Developer API — don't send them.
 *   - aspectRatio ("16:9" | "9:16" | "1:1" | "4:3" | "3:4"), imageSize ("1K"|"2K"|"4K").
 * opts: { aspectRatio, imageSize, model }. Back-compat: a string opts = aspectRatio.
 */
export function geminiGenerateImage(apiKey, defaultModel = DEFAULT_IMAGE_MODEL) {
  if (!apiKey) throw new Error("geminiGenerateImage: missing GEMINI_API_KEY");
  const ai = new GoogleGenAI({ apiKey });
  return async (prompt, opts = {}) => {
    const o = typeof opts === "string" ? { aspectRatio: opts } : opts;
    const aspectRatio = o.aspectRatio ?? "1:1";
    const imageSize = o.imageSize ?? "1K";
    const model = o.model ?? defaultModel;
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio, imageSize },
      },
    });
    const parts = res?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const data = p?.inlineData?.data;
      if (data) return Buffer.from(data, "base64");
    }
    return null;
  };
}

/**
 * Text/code generation — (system, user) → string. Used to have Gemini emit a Level
 * JSON conforming to the Zod schema. `responseMimeType: application/json` asks the
 * model for raw JSON; the caller still validates with parseLevel (and retries with
 * the ZodError fed back). Throws without a key.
 */
export function geminiGenerateText(apiKey, model = DEFAULT_TEXT_MODEL) {
  if (!apiKey) throw new Error("geminiGenerateText: missing GEMINI_API_KEY");
  const ai = new GoogleGenAI({ apiKey });
  return async (system, user, { json = true } = {}) => {
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: user }] }],
      config: {
        systemInstruction: system,
        ...(json ? { responseMimeType: "application/json" } : {}),
        temperature: 0.9,
      },
    });
    return res?.text ?? res?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  };
}
