// Typed client for the culinary-engine endpoint. Sends an ingredient-first
// request and returns 1–2 fully-written, guardrail-validated recipes.

import { API_BASE } from "./generate-recipe";
import type { EngineInput, EngineOutput } from "./culinary/types";

export type GenerateRecipesRequest = EngineInput;
export type GenerateRecipesResponse = EngineOutput;

export async function generateRecipes(
  req: GenerateRecipesRequest,
  signal?: AbortSignal,
): Promise<GenerateRecipesResponse> {
  const res = await fetch(`${API_BASE}/api/generate-recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg?.error ?? "generate_recipes_failed");
  }
  return (await res.json()) as GenerateRecipesResponse;
}
