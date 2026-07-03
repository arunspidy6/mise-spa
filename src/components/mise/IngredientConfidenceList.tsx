import { Check } from "lucide-react";
import type { IngredientGroups } from "@/lib/pantry-model";

// The trust breakdown on the decision screen. Three groups, deliberately framed
// so the user never reads "optional" as "missing / a problem":
//   Available     ✔  — things they told us about
//   Assumed pantry ✓  — staples we quietly assume every kitchen has
//   Optional      ○  — flavour enhancers; the dish is great without them
export function IngredientConfidenceList({ groups }: { groups: IngredientGroups }) {
  return (
    <div className="space-y-4">
      <Group
        eyebrow="Available"
        caption="From what you're using up"
        items={groups.available}
        marker={<Check className="w-3 h-3 text-success" strokeWidth={3} />}
        markerBg="bg-success/15"
        textClass="text-text-primary"
      />
      {groups.assumedPantry.length > 0 && (
        <Group
          eyebrow="Assumed pantry"
          caption="We assume you have these"
          items={groups.assumedPantry}
          marker={<Check className="w-3 h-3 text-text-secondary" strokeWidth={2.5} />}
          markerBg="bg-bg-raised"
          textClass="text-text-secondary"
        />
      )}
      {groups.optional.length > 0 && (
        <Group
          eyebrow="Optional"
          caption="Nice to have — fine to skip"
          items={groups.optional}
          marker={<span className="block w-2 h-2 rounded-full border border-border-strong" />}
          markerBg="bg-transparent"
          textClass="text-text-tertiary"
        />
      )}
    </div>
  );
}

function Group({
  eyebrow,
  caption,
  items,
  marker,
  markerBg,
  textClass,
}: {
  eyebrow: string;
  caption: string;
  items: string[];
  marker: React.ReactNode;
  markerBg: string;
  textClass: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="label-eyebrow">{eyebrow}</span>
        <span className="text-[11px] text-text-tertiary">{caption}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-full bg-bg-surface border border-border-subtle"
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center ${markerBg}`}>{marker}</span>
            <span className={`text-[13px] ${textClass}`}>{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
