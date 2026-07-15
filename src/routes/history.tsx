import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Search, Clock, Bell, X, ChevronRight, Trash2 } from "lucide-react";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { EmberButton } from "@/components/mise/EmberButton";
import { RecipeImage } from "@/components/mise/RecipeImage";
import { useMise } from "@/store/mise";
import { cancelRecipeReminder } from "@/lib/reminders";

export const Route = createFileRoute("/history")({ component: Cookbook });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function reminderParts(cookAt: number) {
  const d = new Date(cookAt);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(d) - startOfDay(new Date())) / 86_400_000);
  return {
    day: dayDiff === 0 ? "Today"
      : dayDiff === 1 ? "Tomorrow"
      : d.toLocaleDateString([], { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
  };
}

function Cookbook() {
  const navigate = useNavigate();
  const history = useMise(s => s.history);
  const saved = useMise(s => s.saved);
  const setRecipe = useMise(s => s.setRecipe);
  const unsaveRecipe = useMise(s => s.unsaveRecipe);

  const [tab, setTab] = useState<"saved" | "cooked">(saved.length > 0 ? "saved" : "cooked");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const cuisines = [...new Set(history.map(h => h.cuisine))];
  const COLORS = ["bg-ember", "bg-success", "bg-warning", "bg-blue-500", "bg-purple-500"];

  // Allow searching only once the cookbook is genuinely long; ignore the query
  // unless search is actually visible so a stale filter can't linger.
  const searchable = saved.length + history.length > 10;
  const q = searchable && searchOpen ? query.trim().toLowerCase() : "";
  const savedList = q ? saved.filter(s => s.recipe.name.toLowerCase().includes(q)) : saved;
  const cookedList = q ? history.filter(h => h.name.toLowerCase().includes(q)) : history;

  // "Cook now" starts cooking straight away rather than dropping the user back
  // on the recipe page.
  const cookNow = (name: string) => {
    const entry = saved.find(s => s.recipe.name === name);
    if (!entry) return;
    setRecipe(entry.recipe);
    navigate({ to: "/cook" });
  };

  const closeSearch = () => { setQuery(""); setSearchOpen(false); };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    unsaveRecipe(pendingDelete);
    cancelRecipeReminder(pendingDelete);
    setPendingDelete(null);
  };

  const subtitle = saved.length > 0
    ? `${saved.length} ${saved.length === 1 ? "recipe" : "recipes"} waiting to be cooked`
    : history.length > 0
      ? "Nothing waiting — pick something new to cook"
      : "Save a recipe to start your cookbook";

  const TABS = [
    { id: "saved" as const, label: "Saved", count: saved.length },
    { id: "cooked" as const, label: "Cooked", count: history.length },
  ];

  return (
    <MobileFrame>
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-4 pt-5 pb-safe">
        {/* Header row */}
        <div className="flex items-center justify-between min-h-[40px]">
          <button onClick={() => navigate({ to: "/" })} aria-label="Back"
            className="w-10 h-10 rounded-full bg-bg-raised flex items-center justify-center text-text-secondary active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {searchable && (
            <button
              onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
              aria-label={searchOpen ? "Close search" : "Search cookbook"}
              className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 ${
                searchOpen ? "bg-ember-glow text-ember-text" : "bg-bg-raised text-text-secondary"
              }`}>
              {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
          )}
        </div>

        <h1 className="font-display text-[32px] font-light text-text-primary mt-4">Your cookbook</h1>
        <p className="text-[14px] text-text-secondary mt-1">{subtitle}</p>

        {searchable && searchOpen && (
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name"
            className="mt-4 h-11 px-4 rounded-xl bg-bg-raised border border-border-default text-[14px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-border-strong"
          />
        )}

        {/* Tab switcher */}
        <div className="mt-5 flex gap-1 p-1 rounded-xl bg-bg-raised border border-border-subtle">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 h-10 rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                tab === t.id ? "bg-bg-base text-text-primary border border-border-subtle" : "text-text-tertiary"
              }`}>
              {t.label}
              <span className={tab === t.id ? "text-ember-text font-semibold" : "text-text-tertiary"}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── Saved tab ─────────────────────────────────────────────────── */}
        {tab === "saved" && (
          <div className="mt-6 space-y-4">
            {savedList.length === 0 ? (
              <p className="text-text-tertiary text-[13px]">
                {q ? "No saved recipes match your search." : "Nothing saved yet. Tap the bookmark on a recipe to keep it for later."}
              </p>
            ) : (
              savedList.map((s) => {
                const { day, time } = reminderParts(s.cookAt);
                return (
                  <div key={s.recipe.name}
                    className="relative rounded-2xl overflow-hidden bg-bg-surface border border-border-subtle">
                    {/* Photo hero with overlaid chips + remove */}
                    <div className="relative">
                      <RecipeImage src={s.recipe.image} cuisine={s.recipe.cuisine} alt={s.recipe.name} height={150} />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="bg-ember text-bg-base text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
                          {s.recipe.cuisine}
                        </span>
                        <span className="bg-black/45 backdrop-blur-sm text-white text-[10px] font-mono px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />{s.recipe.time_minutes} min
                        </span>
                      </div>
                      <button onClick={() => setPendingDelete(s.recipe.name)} aria-label="Remove from cookbook"
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/45 backdrop-blur-sm text-white flex items-center justify-center active:scale-90">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Name + reminder bar */}
                    <div className="p-4 space-y-3">
                      <h3 className="font-display text-[20px] font-light text-text-primary leading-tight">
                        {s.recipe.name}
                      </h3>
                      <div className="rounded-xl bg-bg-raised border border-border-subtle p-3 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-ember-glow flex items-center justify-center flex-shrink-0">
                          <Bell className="w-4 h-4 text-ember-text" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-text-primary">{cap(s.meal)} reminder</p>
                          <p className="text-[12px] text-text-tertiary">{day} · {time}</p>
                        </div>
                        <EmberButton size="sm" onClick={() => cookNow(s.recipe.name)}>
                          Cook now <ChevronRight className="w-4 h-4" />
                        </EmberButton>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Cooked tab ────────────────────────────────────────────────── */}
        {tab === "cooked" && (
          <div className="mt-6">
            {history.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-text-secondary">
                    {history.length} {history.length === 1 ? "dish" : "dishes"}
                  </span>
                  <span className="text-[11px] text-text-tertiary">
                    {cuisines.length} {cuisines.length === 1 ? "cuisine" : "cuisines"}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden flex gap-0.5">
                  {cuisines.map((c, i) => {
                    const count = history.filter(h => h.cuisine === c).length;
                    return <div key={c} style={{ flex: count }} className={`${COLORS[i % COLORS.length]} rounded-full`} />;
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {cookedList.length === 0 ? (
                <p className="text-text-tertiary text-[13px]">
                  {q ? "No cooked dishes match your search." : "Nothing cooked yet. Go make something different."}
                </p>
              ) : (
                cookedList.map((h, i) => (
                  <div key={i} className="bg-bg-surface border border-border-subtle rounded-xl p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-text-primary truncate">{h.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-ember-text">{h.cuisine}</span>
                        <span className="text-[11px] text-text-tertiary">·</span>
                        <span className="text-[11px] text-text-tertiary">
                          {new Date(h.ts).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="text-xl flex-shrink-0 ml-3">
                      {h.rating === "loved" ? "❤️" : h.rating === "good" ? "👍" : "👎"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div onClick={() => setPendingDelete(null)}
          className="absolute inset-0 z-[60] flex items-center justify-center px-8 bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-recipe-title"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === "Escape") setPendingDelete(null); }}
            className="w-full max-w-[320px] bg-bg-surface border border-border-default rounded-2xl p-5">
            <div className="w-11 h-11 rounded-full bg-red-500/15 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h3 id="delete-recipe-title" className="text-[17px] font-semibold text-text-primary">Remove this recipe?</h3>
            <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
              “{pendingDelete}” will be removed from your cookbook and its reminder cancelled.
            </p>
            <div className="flex gap-3 mt-5">
              <button autoFocus onClick={() => setPendingDelete(null)}
                className="flex-1 h-11 rounded-xl bg-bg-elevated border border-border-default text-text-primary text-[14px] font-medium active:scale-[0.98]">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[14px] font-medium active:scale-[0.98] hover:brightness-110">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
