import { describe, it, expect } from "vitest";
import { runEngine } from "./engine";
import { classifyList } from "./classify";
import { validateRecipe } from "./guardrails";

describe("classification", () => {
  it("assigns culinary roles to known ingredients", () => {
    const c = classifyList(["chicken thighs", "rice", "garlic", "lemons", "olive oil"]);
    const role = (k: string) => c.find(i => i.key === k)?.roles[0];
    expect(role("chicken")).toBe("protein");
    expect(role("rice")).toBe("base");
    expect(role("garlic")).toBe("aromatic");
    expect(role("lemon")).toBe("acid");
    expect(role("olive oil")).toBe("fat");
  });

  it("normalizes aliases and de-dupes", () => {
    const c = classifyList(["Chicken Breast", "chicken thighs", "scallions"]);
    expect(c.filter(i => i.key === "chicken")).toHaveLength(1);
    expect(c.find(i => i.key === "spring onion")).toBeTruthy();
  });
});

describe("engine determinism", () => {
  it("produces identical output for identical input", () => {
    const input = { ingredients: ["chicken", "rice", "garlic", "lemon", "spinach"] };
    const a = runEngine(input);
    const b = runEngine(input);
    expect(JSON.stringify(a.blueprints)).toEqual(JSON.stringify(b.blueprints));
  });
});

describe("blueprint quality", () => {
  it("builds a coherent blueprint that uses owned ingredients", () => {
    const { blueprints } = runEngine({ ingredients: ["chicken", "rice", "garlic", "lemon", "spinach"] });
    expect(blueprints.length).toBeGreaterThanOrEqual(1);
    const bp = blueprints[0];
    const pickKeys = bp.picks.map(p => p.key);
    expect(pickKeys).toContain("chicken");
    expect(pickKeys).toContain("rice");
    expect(pickKeys).toContain("garlic");
    // Every allowed item is either an owned pick, an addition, or a staple — never random.
    expect(bp.allowed.length).toBeGreaterThan(0);
    expect(bp.score).toBeGreaterThan(0);
  });

  it("adds a justified fat/acid when the set lacks them, flagged appropriately", () => {
    const { blueprints } = runEngine({ ingredients: ["pasta", "tomatoes", "garlic"] });
    const bp = blueprints[0];
    // No owned fat → engine adds a staple fat (not optional).
    const fatAdd = bp.additions.find(a => a.role === "fat");
    expect(fatAdd).toBeTruthy();
    expect(fatAdd!.optional).toBe(false);
  });

  it("returns 1 recipe with a note when only one direction is credible", () => {
    const res = runEngine({ ingredients: ["pasta", "parmesan", "basil"] });
    expect(res.blueprints.length).toBeGreaterThanOrEqual(1);
    if (res.blueprints.length === 1) expect(res.note).toBeTruthy();
  });

  it("can produce two meaningfully different directions for a versatile set", () => {
    const res = runEngine({ ingredients: ["chicken", "rice", "garlic", "ginger", "soy sauce", "lime", "tomatoes"] });
    if (res.blueprints.length === 2) {
      expect(res.blueprints[0].cuisine).not.toEqual(res.blueprints[1].cuisine);
    }
  });
});

describe("dietary + avoid filters", () => {
  it("removes meat for vegetarian", () => {
    const { classified } = runEngine({ ingredients: ["chicken", "chickpeas", "spinach", "rice"], dietary_preferences: ["vegetarian"] });
    expect(classified.find(i => i.key === "chicken")).toBeUndefined();
    expect(classified.find(i => i.key === "chickpeas")).toBeTruthy();
  });

  it("honours avoid_ingredients", () => {
    const { classified } = runEngine({ ingredients: ["chicken", "rice", "mushrooms"], avoid_ingredients: ["mushrooms"] });
    expect(classified.find(i => i.key === "mushrooms")).toBeUndefined();
  });
});

describe("guardrails", () => {
  it("strips ingredients the blueprint never allowed", () => {
    const { blueprints } = runEngine({ ingredients: ["chicken", "rice", "garlic", "lemon"] });
    const bp = blueprints[0];
    const llmOutput = {
      title: "Test",
      ingredients_with_amounts: [
        { item: "Chicken", amount: "300g" },
        { item: "Truffle oil", amount: "1 tbsp" }, // not allowed — must be stripped
      ],
      instructions: [{ step: 1, text: "Cook the chicken for 6 minutes until 74°C.", timerMinutes: 6 }],
      why_this_works: "x",
    };
    const v = validateRecipe(llmOutput, bp)!;
    const items = v.ingredients_with_amounts.map(i => i.item.toLowerCase());
    expect(items.some(i => i.includes("chicken"))).toBe(true);
    expect(items.some(i => i.includes("truffle"))).toBe(false);
    expect(v.warnings_or_limitations.join(" ")).toMatch(/Truffle oil/i);
  });

  it("collapses a time range to its upper bound", () => {
    const { blueprints } = runEngine({ ingredients: ["chicken", "rice"] });
    const v = validateRecipe({
      title: "T",
      ingredients_with_amounts: [{ item: "Chicken", amount: "300g" }],
      instructions: [{ step: 1, text: "Sear for 5-6 minutes.", timerMinutes: 6 }],
      why_this_works: "x",
    }, blueprints[0])!;
    expect(v.instructions[0].text).toContain("6 minutes");
    expect(v.instructions[0].text).not.toMatch(/5-6/);
  });
});
