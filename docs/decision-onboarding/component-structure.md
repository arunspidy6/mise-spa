# Component structure

## Routes (TanStack file-based)

| Screen | Route file | Purpose |
|---|---|---|
| 1 · Capture | `src/routes/index.tsx` | "What do you want to use up?" — text field, chips, voice placeholder |
| 2 · Intent | `src/routes/intent.tsx` | "What matters tonight?" + "Cooking for" |
| 3 · Decision | `src/routes/decision.tsx` | Hero: ONE meal, why, confidence, ingredient groups (hosts Screen 4) |
| 5 · Cook | `src/routes/cook.tsx` | Reused; header → "Cooking with what you have" |
| 6 · Feedback | `src/routes/feedback.tsx` | Reused; writes `history` for novelty |

Removed: `inventory.tsx`, `session.tsx`, `recipe.tsx`, `history.tsx` (pantry-model UI).

## Components (`src/components/mise/`)

New:
- `IntentCard.tsx` — selectable priority card (Screen 2)
- `ConfidenceMeter.tsx` — three-bar High/Med/Low readout; `sentiment` colours by *good outcome* (Effort "Low" is green)
- `IngredientConfidenceList.tsx` — Available ✔ / Assumed pantry ✓ / Optional ○ groups
- `AdjustSheet.tsx` — Screen 4 bottom sheet

Reused: `MobileFrame`, `EmberButton`, `KeyboardAwareFooter`, `RecipeImage`, `RecipeLoader`.

## Engine libs (`src/lib/`)

- `pantry-model.ts` — Layer 1 (role classification, assumption model, `buildEngineInventory`, `groupIngredients`)
- `dish-templates.ts` — Layer 2 (`DECISION_TEMPLATES`)
- `decision-engine.ts` — Layer 3/5 (`decide()`, confidence, "why", adjust)
- `generate-recipe.ts` — existing engine, reused; exposes `findRecipes`, `buildRecipe`, `userHas`, and merges `DECISION_TEMPLATES` into its candidate pool

## State (`src/store/mise.ts`, Zustand + persist)

```ts
type UrgentIngredient = { name: string; role: 'protein'|'starch'|'vegetable'|'dairy'|'other' };
type Intent = { priority: 'use-up'|'quick'|'comfort'|'healthy'|'different'; size: '1'|'2'|'family'|'meal-prep' };

// store: { urgent, intent, recipe, history, saved }
// actions: setUrgent/addUrgent/removeUrgent/clearUrgent, setIntent, setRecipe, addHistory, saveRecipe/unsaveRecipe
```

The **decision itself is not persisted** — `decision.tsx` computes it with `useMemo(decide(urgent, intent, history))`, so it always reflects the latest capture and there is no stale engine state.

## Data flow

```
Capture (urgent) ─▶ Intent (intent) ─▶ decide(urgent,intent,history)
      │                                     │
      └────────── store (persist) ◀─────────┘
                                            ▼
                               Decision ─▶ setRecipe ─▶ Cook ─▶ Feedback ─▶ history
```
