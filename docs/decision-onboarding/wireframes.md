# Wireframes (low-fi)

The running app is the high-fidelity reference. These low-fi frames capture layout and intent for each screen.

## Screen 1 — Capture
```
┌──────────────────────────────┐
│ GOOD MORNING                 │
│ What do you want to use up?  │  ← Fraunces, ember accent on "use up?"
│ Just name a few things…      │
│                              │
│ ┌──────────────────────────┐ │
│ │ [Chicken ×][Potatoes ×]  │ │  ← captured chips (ember)
│ │ [Carrots ×]              │ │
│ │ Add another…        (🎙) │ │  ← free text + voice placeholder
│ └──────────────────────────┘ │
│ OR TAP WHAT YOU'VE GOT       │
│ [+Chicken][+Eggs][+Pasta]…   │  ← quick-add suggestions
│                              │
│ ┌──────────────────────────┐ │
│ │      Find my meal  →     │ │  ← primary CTA (ember)
│ └──────────────────────────┘ │
└──────────────────────────────┘
```
No spices. No categories. No pantry.

## Screen 2 — Intent
```
┌──────────────────────────────┐
│ ←                            │
│ What matters tonight?        │
│ Using chicken, potatoes…     │
│ ┌──────────────────────────┐ │
│ │ 🥬 Use up ingredients  ◉ │ │  ← single-select cards
│ │ ⚡ Quick meal          ○ │ │
│ │ 🍲 Comfort food        ○ │ │
│ │ 🥗 Healthy             ○ │ │
│ │ ✨ Try something diff. ○ │ │
│ └──────────────────────────┘ │
│ COOKING FOR                  │
│ [Just me][2 ◉][Family][Prep] │
│ ┌──────────────────────────┐ │
│ │     Create my meal  →    │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

## Screen 3 — Decision (HERO)
```
┌──────────────────────────────┐
│ ←              Option 1 of 3 │
│ ✦ TONIGHT, MAKE              │
│ ┌────────[ photo ]─────────┐ │
│ │ COMFORT · 50 min · serves2│ │
│ │ Rustic Chicken & Root     │ │  ← ONE meal
│ │ Vegetable Tray Bake       │ │
│ │ Everything roasts…        │ │
│ └──────────────────────────┘ │
│ WHY THIS MEAL                │
│ ✓ Uses your chicken, potato… │
│ ✓ Helps use things up        │
│ ✓ Only basic staples         │
│ ✓ Low effort                 │
│ [COMPLETION High][EFFORT Low][TASTE High] │
│ AVAILABLE   ✓Chicken ✓Potato ✓Carrots     │
│ ASSUMED     ✓Salt ✓Oil ✓Onion             │
│ OPTIONAL    ○Herbs ○Pepper                │
│ ┌──────────────────────────┐ │
│ │     Start cooking  →      │ │
│ └──────────────────────────┘ │
│ [   See another option   ]   │  ← only if alts exist (≤2)
└──────────────────────────────┘
```

## Screen 4 — Adjust (conditional bottom sheet)
```
        ▁▁▁▁▁▁ dimmed ▁▁▁▁▁▁
┌──────────────────────────────┐
│ ───                          │
│ Let's adjust your meal       │
│ The best match needs cream,  │
│ which you haven't mentioned… │
│ ┌──────────────────────────┐ │
│ │✓ Create a version with   │ │  ← recommended
│ │  what I have             │ │
│ │⇄ Choose another meal     │ │
│ │+ Add the missing ingred. │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

## Screen 5 — Cook (reused)
```
← Back        COOKING WITH WHAT YOU HAVE
Mise en place → step-by-step · quantities
by serving · timers · substitutions
```

## Screen 6 — Feedback (reused)
```
How was <dish>?
[❤️ Loved it][👍 Good][👎 Would change]
→ Cook this again?  → improves future picks
```
