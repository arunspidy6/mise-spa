# User flow

```mermaid
flowchart TD
    A["SCREEN 1 · Capture<br/>What do you want to use up?<br/>free text · chips · voice"] --> B["SCREEN 2 · Intent<br/>What matters tonight?<br/>+ cooking for"]
    B --> T{{"decide()<br/>local, instant"}}
    T --> D["SCREEN 3 · Decision (HERO)<br/>ONE meal + confidence read-out"]

    D -->|"best is missing an ESSENTIAL"| M["SCREEN 4 · Adjust<br/>Let's adjust your meal"]
    M -->|"Create with what I have"| D
    M -->|"Choose another meal"| D
    M -->|"Add missing ingredient"| A

    D -->|"See another option (≤2 alts)"| D
    D -->|"Start cooking"| E["SCREEN 5 · Cook mode<br/>Cooking with what you have<br/>steps · quantities · timers · swaps"]
    E --> F["SCREEN 6 · Feedback<br/>How was it? · Cook again?"]
    F -->|"writes history"| N[("Novelty signal<br/>demotes repeats next time")]
    F --> A
    N -.->|"feeds"| T
```

## Notes

- **Capture → Intent → Decision** is the whole onboarding. No account, no pantry setup, no category tour.
- The **decision is computed locally and instantly** from `(urgent ingredients, intent, cook history)` — it's deterministic, so the flow always reflects the latest capture and demos reliably with no network dependency.
- **Screen 4 is conditional.** It only appears when the best feasible dish is still missing a truly *essential* ingredient (the engine's `sparse` flag). In the common case the user goes straight from Intent to a confident Decision.
- **The loop closes:** feedback writes to `history`, which the novelty layer reads on the next decision to avoid repeating recent meals — without ever overriding feasibility or taste.
