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

export const DEFAULT_IMAGE_MODEL = "imagen-4.0-fast-generate-001";

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
 * (prompt, aspectRatio?) → PNG bytes (Buffer) or null. Throws without a key.
 * aspectRatio is an Imagen ratio string ("16:9" | "9:16" | "1:1" | "4:3" | "3:4");
 * defaults to "1:1" when omitted.
 */
export function geminiGenerateImage(apiKey, model = DEFAULT_IMAGE_MODEL) {
  if (!apiKey) throw new Error("geminiGenerateImage: missing GEMINI_API_KEY");
  const ai = new GoogleGenAI({ apiKey });
  return async (prompt, aspectRatio = "1:1") => {
    const res = await ai.models.generateImages({
      model,
      prompt,
      config: { numberOfImages: 1, aspectRatio },
    });
    const b64 = res?.generatedImages?.[0]?.image?.imageBytes;
    return b64 ? Buffer.from(b64, "base64") : null;
  };
}
