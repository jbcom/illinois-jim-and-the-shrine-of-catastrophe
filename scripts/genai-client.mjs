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
  return readFileSync(envPath, "utf8").match(/GEMINI_API_KEY=(\S+)/)?.[1];
}

/** prompt → PNG bytes (Buffer) or null. Throws without a key. */
export function geminiGenerateImage(apiKey, model = DEFAULT_IMAGE_MODEL) {
  if (!apiKey) throw new Error("geminiGenerateImage: missing GEMINI_API_KEY");
  const ai = new GoogleGenAI({ apiKey });
  return async (prompt) => {
    const res = await ai.models.generateImages({ model, prompt, config: { numberOfImages: 1 } });
    const b64 = res?.generatedImages?.[0]?.image?.imageBytes;
    return b64 ? Buffer.from(b64, "base64") : null;
  };
}
