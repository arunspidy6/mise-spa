# Example scenarios

Traced through the real engine (`decide()`), intent = "Use up ingredients", cooking for 2. These are the actual outputs, not mock-ups.

## Scenario 1 — Chicken + potatoes + carrots

**Roles:** chicken → protein, potatoes → starch, carrots → vegetable

**→ Rustic Chicken & Root Vegetable Tray Bake** — Completion **High** · Effort **Low** · Taste **High**

| Group | Items |
|---|---|
| Available | Chicken thighs, Potatoes, Carrots |
| Assumed pantry | Onion, Olive oil, Salt |
| Optional | Garlic, Rosemary, Black pepper |

*Why:* uses your chicken, potatoes and carrots · helps you use things up · only basic staples · low effort. Matches the brief's canonical example exactly. Alternatives offered: a second tray bake and a pan-fried chicken breast.

## Scenario 2 — Spaghetti + tomato

**Roles:** spaghetti → starch, tomato → vegetable

**→ Silky Tomato Pasta** — Completion **High** · Effort **Low** · Taste **High**

| Group | Items |
|---|---|
| Available | Spaghetti, Tomatoes |
| Assumed pantry | Garlic, Olive oil, Salt |
| Optional | Chilli flakes, Parmesan |

The engine will **not** propose a creamy pasta and fake the cream: cream is an *essential* of that dish, so it's filtered out as infeasible. A coherent no-cream dish wins instead — the exact behaviour Screen 4's principle demands. Alternative: Garlic Butter Pasta.

## Scenario 3 — Chicken + rice (limited pantry)

**Roles:** chicken → protein, rice → starch

**→ One-Pan Chicken & Rice** — Completion **High** · Effort **Medium** · Taste **High**

| Group | Items |
|---|---|
| Available | Chicken thighs, Rice |
| Assumed pantry | Onion, Stock, Olive oil, Salt |
| Optional | Garlic, Paprika |

Shows the assumption model doing its job: the dish leans on HIGH/MEDIUM-confidence staples (oil, salt, stock, onion) the user never mentioned, and optional uncertainty (garlic, paprika) never blocks the recommendation.

## Scenario 4 — User repeats the same meals

Same input as Scenario 1, but the tray bake was cooked 2 days ago (in `history`).

**→ Chicken Thigh & Potato Traybake** (a *different* dish) surfaces first; the recently-cooked "Rustic… Tray Bake" is demoted to a low-ranked alternative by the novelty penalty (0.05× within 7 days).

Feasibility and taste are preserved — novelty only reorders among dishes that are already feasible and confident. It never resurrects an impossible meal to chase variety.

## Adjust path (Screen 4 trigger)

A lone protein with nothing to build on — e.g. **salmon** only — yields the closest candidate flagged `needsAdjust: true` with the missing essential surfaced (e.g. "soy sauce"). The decision screen opens the **Let's adjust your meal** sheet: create-with-what-I-have (recommended) · choose another · add the missing ingredient.
