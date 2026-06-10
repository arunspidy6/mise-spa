import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MobileFrame } from "@/components/mise/MobileFrame";
import { useMise } from "@/store/mise";

export const Route = createFileRoute("/history")({ component: History });

function History() {
  const navigate = useNavigate();
  const history = useMise(s => s.history);
  const cuisines = [...new Set(history.map(h => h.cuisine))];
  const COLORS = ["bg-ember","bg-success","bg-warning","bg-blue-500","bg-purple-500"];

  return (
    <MobileFrame>
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-4 pt-5 pb-safe">
        <button onClick={() => navigate({ to: "/" })}
          className="w-10 h-10 -ml-2 flex items-center justify-center text-text-secondary mb-6 active:scale-90">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="font-display text-[32px] font-light text-text-primary">Your cooking journal</h1>
        <p className="text-[14px] text-text-secondary mt-2">
          {history.length} {history.length === 1 ? "dish" : "dishes"} · {cuisines.length} {cuisines.length === 1 ? "cuisine" : "cuisines"}
        </p>

        {history.length > 0 && (
          <div className="mt-6 h-2 rounded-full overflow-hidden flex gap-0.5">
            {cuisines.map((c, i) => {
              const count = history.filter(h => h.cuisine === c).length;
              return <div key={c} style={{ flex: count }} className={`${COLORS[i % COLORS.length]} rounded-full`} />;
            })}
          </div>
        )}

        <div className="mt-8 space-y-3">
          {history.length === 0 ? (
            <p className="text-text-tertiary text-[14px]">Nothing cooked yet. Go make something different.</p>
          ) : (
            history.map((h, i) => (
              <div key={i} className="bg-bg-surface border border-border-subtle rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium text-text-primary">{h.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-ember-text">{h.cuisine}</span>
                    <span className="text-[11px] text-text-tertiary">·</span>
                    <span className="text-[11px] text-text-tertiary">
                      {new Date(h.ts).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className="text-xl">
                  {h.rating === "loved" ? "❤️" : h.rating === "good" ? "👍" : "👎"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </MobileFrame>
  );
}
