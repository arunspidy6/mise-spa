# Mise — Decision-First Onboarding

A cooking **decision assistant**, not a recipe browser or a pantry tracker.

> **Goal:** Help users confidently decide what to cook using ingredients they want to use up, without documenting their entire kitchen.
>
> **Emotional target:** *"I know what I'm cooking tonight."*

This folder documents the new onboarding built on branch `feat/cooking-decision-assistant`. Production (`main` → `mise-spa.vercel.app`) is untouched; this ships as a separate preview so the old version stays live for testing.

## What changed

The old app opened with a **pantry-inventory** flow — tag proteins/carbs/veg/fridge across category screens before you could get a recipe. That is the "kitchen as a database" feeling this rebuild removes. The new front-of-funnel is three screens:

1. **Capture** the few ingredients you want to use up (free text / chips / voice placeholder).
2. **Intent** — what matters tonight + who you're cooking for.
3. **Decision** — ONE recommended meal with a transparent confidence read-out.

Cook mode and the feedback loop are reused from the existing app.

## Core principles (and where they live)

| Principle | Implementation |
|---|---|
| Capture urgent ingredients, not the pantry | `routes/index.tsx` — no spices/categories asked |
| Assume common staples intelligently | `lib/pantry-model.ts` — HIGH/MEDIUM/LOW assumption model |
| Never recommend impossible meals | `lib/generate-recipe.ts` `findRecipes` — feasibility filter |
| Reduce decision fatigue → one best meal | `lib/decision-engine.ts` — returns 1 best + ≤2 alts |
| Explain why it's reliable | `decision.tsx` "Why this meal" + confidence meters |
| Adapt recipes to what's available | criticality model + `AdjustSheet` (Screen 4) |

## Docs in this folder

- [`user-flow.md`](./user-flow.md) — end-to-end flow diagram
- [`ai-decision-logic.md`](./ai-decision-logic.md) — the 5-layer hybrid engine
- [`component-structure.md`](./component-structure.md) — routes, components, data shapes
- [`wireframes.md`](./wireframes.md) — low-fi wireframes per screen
- [`scenarios.md`](./scenarios.md) — the four required scenarios, traced through the engine
