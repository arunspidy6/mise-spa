// ══════════════════════════════════════════════════════════════════════════
// MISE · iOS Design System
// Token-based · Semantic names · Atomic components · Auto-layout
// File: Mise — iOS Design System (TS7AYuFnNpnafafXpwn0e1)
// Paste into Figma › Plugins › Development › Open Console
// ══════════════════════════════════════════════════════════════════════════

(async () => {

// ── 1. Font loading ─────────────────────────────────────────────────────────
const FONT_PAIRS = [
  ["Fraunces","Light"],["Fraunces","Regular"],
  ["DM Sans","Regular"],["DM Sans","Medium"],["DM Sans","SemiBold"],["DM Sans","Bold"],
  ["DM Mono","Regular"],["DM Mono","Medium"],
  ["Inter","Regular"],["Inter","Medium"],["Inter","Semi Bold"],["Inter","Bold"],
];
for (const [f,s] of FONT_PAIRS) { try { await figma.loadFontAsync({family:f,style:s}); } catch {} }

const F = {
  display:  {family:"Fraunces",style:"Light"},
  serif:    {family:"Fraunces",style:"Regular"},
  body:     {family:"DM Sans",style:"Regular"},
  bodyMed:  {family:"DM Sans",style:"Medium"},
  bodySemi: {family:"DM Sans",style:"SemiBold"},
  bodyBold: {family:"DM Sans",style:"Bold"},
  mono:     {family:"DM Mono",style:"Regular"},
  monoMed:  {family:"DM Mono",style:"Medium"},
};
const safe = (f) => { try { return f; } catch { return {family:"Inter",style:"Regular"}; } };

// ── 2. Colour tokens ─────────────────────────────────────────────────────────
const C = {
  bgBase:       {r:0.059,g:0.055,b:0.047},
  bgSurface:    {r:0.102,g:0.098,b:0.086},
  bgRaised:     {r:0.141,g:0.133,b:0.125},
  bgOverlay:    {r:0.180,g:0.173,b:0.161},
  textPrimary:  {r:0.941,g:0.929,b:0.910},
  textSecondary:{r:0.612,g:0.596,b:0.565},
  textTertiary: {r:0.361,g:0.353,b:0.337},
  textInverse:  {r:0.059,g:0.055,b:0.047},
  ember:        {r:0.910,g:0.459,b:0.102},
  emberDim:     {r:0.541,g:0.239,b:0.031},
  emberGlow:    {r:0.180,g:0.102,b:0.031},
  emberText:    {r:0.961,g:0.647,b:0.353},
  success:      {r:0.290,g:0.620,b:0.420},
  successBg:    {r:0.051,g:0.141,b:0.094},
  warning:      {r:0.831,g:0.627,b:0.090},
  error:        {r:0.788,g:0.251,b:0.251},
  errorBg:      {r:0.165,g:0.051,b:0.051},
  borderSubtle: {r:0.180,g:0.173,b:0.161},
  borderDefault:{r:0.239,g:0.231,b:0.216},
  borderStrong: {r:0.361,g:0.353,b:0.337},
  white:        {r:1,g:1,b:1},
  black:        {r:0,g:0,b:0},
};

const fill  = (c,a=1) => [{type:"SOLID",color:c,opacity:a}];
const stroke = (c,w=1) => { return {s:[{type:"SOLID",color:c}],w}; };

// ── 3. Variable collection ────────────────────────────────────────────────────
const page = figma.currentPage;
page.name = "Mise iOS Design System";
for (const n of [...page.children]) n.remove();

// Create Figma variable collections for real token system
const colColl = figma.variables.createVariableCollection("🎨 Colour Tokens");
const mode = colColl.modes[0].modeId;
colColl.renameMode(mode, "Dark");

const TOKEN_MAP = {
  // Backgrounds
  "bg/base": C.bgBase, "bg/surface": C.bgSurface,
  "bg/raised": C.bgRaised, "bg/overlay": C.bgOverlay,
  // Text
  "text/primary": C.textPrimary, "text/secondary": C.textSecondary,
  "text/tertiary": C.textTertiary, "text/inverse": C.textInverse,
  // Brand
  "brand/ember": C.ember, "brand/ember-dim": C.emberDim,
  "brand/ember-glow": C.emberGlow, "brand/ember-text": C.emberText,
  // Semantic
  "semantic/success": C.success, "semantic/success-bg": C.successBg,
  "semantic/warning": C.warning, "semantic/error": C.error,
  "semantic/error-bg": C.errorBg,
  // Borders
  "border/subtle": C.borderSubtle, "border/default": C.borderDefault,
  "border/strong": C.borderStrong,
};

const tokenVars = {};
for (const [name, rgb] of Object.entries(TOKEN_MAP)) {
  const v = figma.variables.createVariable(name, colColl, "COLOR");
  v.setValueForMode(mode, {...rgb, a:1});
  tokenVars[name] = v;
}

// Spacing collection
const spaceColl = figma.variables.createVariableCollection("📐 Spacing");
const spaceMode = spaceColl.modes[0].modeId;
spaceColl.renameMode(spaceMode, "Base");
const SPACING = {xs:4,sm:8,md:12,lg:16,xl:20,"2xl":24,"3xl":32,"4xl":40,"5xl":48,"6xl":64};
for (const [n,v] of Object.entries(SPACING)) {
  const sv = figma.variables.createVariable(`spacing/${n}`, spaceColl, "FLOAT");
  sv.setValueForMode(spaceMode, v);
}

// Radius collection
const radColl = figma.variables.createVariableCollection("🔄 Border Radius");
const radMode = radColl.modes[0].modeId;
radColl.renameMode(radMode, "Base");
const RADII = {sm:6,md:10,lg:14,xl:20,"2xl":24,full:999};
for (const [n,v] of Object.entries(RADII)) {
  const rv = figma.variables.createVariable(`radius/${n}`, radColl, "FLOAT");
  rv.setValueForMode(radMode, v);
}

// Typography collection
const typoColl = figma.variables.createVariableCollection("✍️ Typography");
const typoMode = typoColl.modes[0].modeId;
typoColl.renameMode(typoMode, "Base");
const SIZES = {display:48,"h1":36,"h2":28,"h3":20,body:16,"body-sm":14,label:11,caption:11,mono:13};
for (const [n,v] of Object.entries(SIZES)) {
  const tv = figma.variables.createVariable(`size/${n}`, typoColl, "FLOAT");
  tv.setValueForMode(typoMode, v);
}

// ── 4. Helpers ────────────────────────────────────────────────────────────────
function applyV(node, tokenName) {
  const v = tokenVars[tokenName];
  if (!v) { node.fills = fill(C.bgBase); return; }
  node.fills = [figma.variables.setBoundVariableForPaint({type:"SOLID",color:{r:0,g:0,b:0}}, "color", v)];
}
function applyVStroke(node, tokenName, w=1) {
  const v = tokenVars[tokenName];
  if (!v) return;
  node.strokes = [figma.variables.setBoundVariableForPaint({type:"SOLID",color:{r:0,g:0,b:0}}, "color", v)];
  node.strokeWeight = w;
  node.strokeAlign = "INSIDE";
}

async function T(str, font, size, tokenName, opts={}) {
  const t = figma.createText();
  try { t.fontName = safe(font); } catch { t.fontName = {family:"Inter",style:"Regular"}; }
  t.fontSize = size;
  t.characters = String(str);
  applyV(t, tokenName);
  if (opts.ls) t.letterSpacing = {unit:"PIXELS",value:opts.ls};
  if (opts.lh) t.lineHeight = {unit:"PERCENT",value:opts.lh};
  if (opts.upper) t.characters = t.characters.toUpperCase();
  return t;
}

function AL(name, dir, gap, padH, padV) {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = dir || "HORIZONTAL";
  f.itemSpacing = gap || 0;
  f.paddingLeft = f.paddingRight = padH || 0;
  f.paddingTop = f.paddingBottom = padV || 0;
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  f.fills = [];
  return f;
}

function BOX(name, w, h, token, radius=0) {
  const f = figma.createFrame();
  f.name = name;
  f.resize(w,h);
  f.cornerRadius = radius;
  if (token) applyV(f, token);
  else f.fills = [];
  return f;
}

let Y = 0;
const addToPage = (node, x=0) => { node.x = x; node.y = Y; page.appendChild(node); };
const gap = (h) => { Y += h; };

// ── 5. Cover ─────────────────────────────────────────────────────────────────
const cover = BOX("🔖 Cover", 1800, 320, "bg/base", 0);
addToPage(cover); gap(360);

const cvTitle = await T("Mise", F.display, 80, "text/primary");
const cvDot = await T(".", F.display, 80, "brand/ember");
cvTitle.x = 64; cvTitle.y = 64; cover.appendChild(cvTitle);
cvDot.x = 64 + cvTitle.width - 4; cvDot.y = 64; cover.appendChild(cvDot);

const cvSub = await T("iOS Design System · Token-based · Atomic · HIG Compliant", F.bodyMed, 18, "text/secondary");
const cvTag = await T("Fraunces + DM Sans + DM Mono · Dark Mode · Figma Variables", F.mono, 12, "text/tertiary");
cvSub.x = 64; cvSub.y = 172; cover.appendChild(cvSub);
cvTag.x = 64; cvTag.y = 206; cover.appendChild(cvTag);

const cvBadge = BOX("badge", 160, 32, "emberGlow", 999);
cvBadge.x = 64; cvBadge.y = 240; cover.appendChild(cvBadge);
applyV(cvBadge, "brand/ember-glow");
applyVStroke(cvBadge, "brand/ember-dim", 1);
const cvBadgeTxt = await T("Dark Mode · v1.0", F.monoMed, 11, "brand/ember-text");
cvBadgeTxt.x = 16; cvBadgeTxt.y = 9; cvBadge.appendChild(cvBadgeTxt);

// ── 6. Colour Tokens section ─────────────────────────────────────────────────
async function sectionEyebrow(label) {
  const t = await T(label, F.monoMed, 11, "text/tertiary", {upper:true, ls:1.4});
  addToPage(t); gap(22);
}
async function sectionTitle(label) {
  const t = await T(label, F.display, 36, "text/primary");
  addToPage(t); gap(56);
}

await sectionEyebrow("01 — Colour Tokens");
await sectionTitle("Colour Tokens");

const TOKEN_HEX = {
  "bg/base":"#0F0E0C","bg/surface":"#1A1916","bg/raised":"#242220","bg/overlay":"#2E2C29",
  "text/primary":"#F0EDE8","text/secondary":"#9C9890","text/tertiary":"#5C5A56","text/inverse":"#0F0E0C",
  "brand/ember":"#E8751A","brand/ember-dim":"#8A3D08","brand/ember-glow":"#2E1A08","brand/ember-text":"#F5A55A",
  "semantic/success":"#4A9E6B","semantic/success-bg":"#0D2418","semantic/warning":"#D4A017",
  "semantic/error":"#C94040","semantic/error-bg":"#2A0D0D",
  "border/subtle":"#2E2C29","border/default":"#3D3B37","border/strong":"#5C5A56",
};

const COLOUR_GROUPS = [
  {label:"Backgrounds", tokens:["bg/base","bg/surface","bg/raised","bg/overlay"]},
  {label:"Text",        tokens:["text/primary","text/secondary","text/tertiary","text/inverse"]},
  {label:"Brand · Ember",tokens:["brand/ember","brand/ember-dim","brand/ember-glow","brand/ember-text"]},
  {label:"Semantic",    tokens:["semantic/success","semantic/success-bg","semantic/warning","semantic/error","semantic/error-bg"]},
  {label:"Borders",     tokens:["border/subtle","border/default","border/strong"]},
];

for (const group of COLOUR_GROUPS) {
  const gL = await T(group.label, F.bodySemi, 12, "text/primary");
  addToPage(gL); gap(20);

  const row = AL(`tokens-${group.label}`, "HORIZONTAL", 16, 0, 0);
  addToPage(row);

  for (const tk of group.tokens) {
    const col = AL(tk, "VERTICAL", 6, 0, 0);
    const sw = BOX("swatch", 96, 64, tk, 12);
    applyVStroke(sw, "border/subtle", 1);
    const nL = await T(tk.split("/")[1] ?? tk, F.monoMed, 10, "text/primary");
    const hL = await T(TOKEN_HEX[tk] ?? "", F.mono, 9, "text/tertiary");
    col.appendChild(sw); col.appendChild(nL); col.appendChild(hL);
    row.appendChild(col);
  }
  gap(row.height + 24);
}
gap(32);

// ── 7. Typography section ─────────────────────────────────────────────────────
await sectionEyebrow("02 — Typography");
await sectionTitle("Type Scale");

const TYPO = [
  {name:"Display / Fraunces Light 48", font:F.display,  size:48, tk:"text/primary",   sample:"Cook something different"},
  {name:"H1 / Fraunces Light 36",      font:F.display,  size:36, tk:"text/primary",   sample:"Just cook something tonight"},
  {name:"H2 / Fraunces Light 28",      font:F.display,  size:28, tk:"text/primary",   sample:"What's in your kitchen?"},
  {name:"H3 / DM Sans SemiBold 20",    font:F.bodySemi, size:20, tk:"text/primary",   sample:"Soy-glazed chicken with garlic rice"},
  {name:"Body / DM Sans Regular 16",   font:F.body,     size:16, tk:"text/secondary", sample:"Sticky caramelised chicken over garlic-fried rice. One pan, 25 minutes."},
  {name:"Body Sm / DM Sans 14",        font:F.body,     size:14, tk:"text/secondary", sample:"Tap everything you have right now. This drives your recipes."},
  {name:"Label / DM Sans SemiBold 11", font:F.bodySemi, size:11, tk:"text/tertiary",  sample:"PANTRY STAPLES", upper:true, ls:1.4},
  {name:"Caption / DM Sans 11",        font:F.body,     size:11, tk:"text/tertiary",  sample:"3 items missing · Updated 2 days ago"},
  {name:"Mono / DM Mono Medium 13",    font:F.monoMed,  size:13, tk:"brand/ember-text",sample:"05:00 · tabular · timers"},
];

for (const t of TYPO) {
  const row = AL(t.name, "HORIZONTAL", 40, 0, 0);
  row.counterAxisAlignItems = "CENTER";
  addToPage(row);

  const lbl = await T(t.name, F.monoMed, 10, "text/tertiary");
  lbl.textAutoResize = "HEIGHT";
  lbl.resize(260, lbl.height);
  row.appendChild(lbl);

  const s = await T(t.sample, t.font, t.size, t.tk, {upper:t.upper, ls:t.ls});
  row.appendChild(s);
  gap(row.height + 20);
}
gap(32);

// ── 8. Spacing section ────────────────────────────────────────────────────────
await sectionEyebrow("03 — Spacing");
await sectionTitle("Spacing Scale");

const spRow = AL("spacing-scale", "HORIZONTAL", 20, 0, 0);
spRow.counterAxisAlignItems = "FLEX_END";
addToPage(spRow);

const maxSp = 64;
for (const [name, val] of Object.entries(SPACING)) {
  const col = AL(`spacing/${name}`, "VERTICAL", 6, 0, 0);
  col.counterAxisAlignItems = "CENTER";
  const bar = BOX("bar", Math.max(val,8), val, "brand/ember", 3);
  const nL = await T(name, F.monoMed, 10, "text/primary");
  const vL = await T(`${val}`, F.mono, 9, "text/tertiary");
  col.appendChild(bar); col.appendChild(nL); col.appendChild(vL);
  spRow.appendChild(col);
}
gap(spRow.height + 64);

// ── 9. Border radius section ──────────────────────────────────────────────────
await sectionEyebrow("04 — Border Radius");
await sectionTitle("Radius Scale");

const radRow = AL("radius-scale", "HORIZONTAL", 24, 0, 0);
radRow.counterAxisAlignItems = "CENTER";
addToPage(radRow);

for (const [name, val] of Object.entries(RADII)) {
  const col = AL(`radius/${name}`, "VERTICAL", 8, 0, 0);
  col.counterAxisAlignItems = "CENTER";
  const sq = BOX("shape", 72, 72, "bg/surface", Math.min(val,36));
  applyVStroke(sq, "brand/ember", 2);
  const nL = await T(name, F.monoMed, 11, "text/primary");
  const vL = await T(val === 999 ? "∞" : `${val}px`, F.mono, 10, "text/tertiary");
  col.appendChild(sq); col.appendChild(nL); col.appendChild(vL);
  radRow.appendChild(col);
}
gap(radRow.height + 64);

// ── 10. Components ────────────────────────────────────────────────────────────
await sectionEyebrow("05 — Components");
await sectionTitle("Atomic Components");

// Helper: make component
function MC(name) {
  const c = figma.createComponent();
  c.name = name;
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisAlignItems = "CENTER";
  c.counterAxisAlignItems = "CENTER";
  c.primaryAxisSizingMode = "AUTO";
  c.counterAxisSizingMode = "AUTO";
  return c;
}

function wrapSet(comps, label, dir="HORIZONTAL") {
  const set = figma.combineAsVariants(comps, page);
  set.name = label;
  set.x = 0; set.y = Y;
  applyV(set, "bg/base");
  set.strokes = [{type:"SOLID",color:{r:0.35,g:0.35,b:0.35}}];
  set.strokeDashes = [4,4]; set.strokeWeight = 1;
  set.paddingTop = set.paddingBottom = 20;
  set.paddingLeft = set.paddingRight = 20;
  set.itemSpacing = dir === "HORIZONTAL" ? 16 : 12;
  set.layoutMode = dir;
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  set.cornerRadius = 8;
  return set;
}

// ── Button Component Set ──────────────────────────────────────────────────────
const btnL = await T("Button", F.bodySemi, 14, "text/primary");
addToPage(btnL); gap(24);

const BTN_V = [
  {name:"Type=Primary,  Size=Large", bg:"brand/ember", tc:"text/inverse", stroke:null, label:"Find me something →", h:52, px:24, r:14},
  {name:"Type=Secondary,Size=Large", bg:"bg/raised",   tc:"text/primary", stroke:"border/default", label:"↻  Not this", h:52, px:24, r:14},
  {name:"Type=Ghost,   Size=Large",  bg:null,          tc:"text/secondary",stroke:null, label:"Skip for now", h:52, px:24, r:14},
  {name:"Type=Danger,  Size=Large",  bg:"semantic/error-bg", tc:"semantic/error", stroke:"semantic/error", label:"Remove", h:52, px:24, r:14},
  {name:"Type=Primary, Size=Small",  bg:"brand/ember", tc:"text/inverse", stroke:null, label:"Start", h:40, px:16, r:10},
  {name:"Type=Primary, Size=Medium", bg:"brand/ember", tc:"text/inverse", stroke:null, label:"Next →", h:48, px:20, r:12},
];

const btnComps = [];
for (const v of BTN_V) {
  const c = MC(v.name);
  c.paddingLeft = c.paddingRight = v.px;
  c.counterAxisSizingMode = "FIXED";
  c.counterAxisFixedSize = v.h;
  if (v.bg) applyV(c, v.bg); else c.fills = [];
  if (v.stroke) applyVStroke(c, v.stroke, 1.5);
  c.cornerRadius = v.r;
  const t = await T(v.label, F.bodySemi, v.h === 40 ? 13 : v.h === 48 ? 14 : 15, v.tc);
  c.appendChild(t);
  btnComps.push(c);
}
const btnSet = wrapSet(btnComps, "Button");
gap(btnSet.height + 16);
const btnNote = await T("Button — 6 variants. Primary/Secondary/Ghost/Danger × Large/Medium/Small. Min 44pt touch target (iOS HIG).", F.body, 11, "text/tertiary");
addToPage(btnNote); gap(48);

// ── Chip Component Set ────────────────────────────────────────────────────────
const chipL = await T("Chip / Ingredient Selection", F.bodySemi, 14, "text/primary");
addToPage(chipL); gap(24);

const CHIP_V = [
  {name:"State=Selected",     bg:"brand/ember",     tc:"text/inverse",   stroke:"brand/ember",     label:"Chicken thighs"},
  {name:"State=Unselected",   bg:"bg/raised",       tc:"text/secondary", stroke:"border/default",  label:"Salmon"},
  {name:"State=Pre-selected", bg:"brand/ember-glow",tc:"brand/ember-text",stroke:"brand/ember-dim",label:"Olive oil"},
  {name:"State=Removed",      bg:"bg/base",         tc:"text/tertiary",  stroke:"border/subtle",   label:"Used up"},
];
const chipComps = [];
for (const v of CHIP_V) {
  const c = MC(v.name);
  c.paddingLeft = c.paddingRight = 14;
  c.paddingTop = c.paddingBottom = 9;
  c.itemSpacing = 6;
  c.cornerRadius = 999;
  applyV(c, v.bg);
  applyVStroke(c, v.stroke, 1.5);
  const t = await T(v.label, F.bodyMed, 13, v.tc);
  c.appendChild(t);
  chipComps.push(c);
}
const chipSet = wrapSet(chipComps, "Chip");
gap(chipSet.height + 48);

// ── Input Component Set ───────────────────────────────────────────────────────
const inputL = await T("Input / Text Field", F.bodySemi, 14, "text/primary");
addToPage(inputL); gap(24);

const INPUT_V = [
  {name:"State=Default", bg:"bg/surface", stroke:"border/default", tc:"text/tertiary", val:"Add something else…",   sw:1.5},
  {name:"State=Focused", bg:"bg/surface", stroke:"brand/ember",    tc:"text/primary",  val:"Coconut milk",          sw:2},
  {name:"State=Error",   bg:"semantic/error-bg", stroke:"semantic/error", tc:"text/primary", val:"Invalid entry",   sw:1.5},
];
const inputComps = [];
for (const v of INPUT_V) {
  const c = MC(v.name);
  c.resize(320, 52);
  c.counterAxisSizingMode = "FIXED";
  c.counterAxisFixedSize = 52;
  c.paddingLeft = c.paddingRight = 16;
  c.cornerRadius = 14;
  applyV(c, v.bg);
  applyVStroke(c, v.stroke, v.sw);
  const t = await T(v.val, F.body, 15, v.tc);
  c.appendChild(t);
  inputComps.push(c);
}
const inputSet = wrapSet(inputComps, "Input");
gap(inputSet.height + 48);

// ── Rating Card Component Set ─────────────────────────────────────────────────
const ratingL = await T("Rating Card", F.bodySemi, 14, "text/primary");
addToPage(ratingL); gap(24);

const RATING_V = [
  {name:"State=Default", bg:"bg/surface",         stroke:"border/default", tc:"text/secondary", emoji:"❤️", label:"Loved it"},
  {name:"State=Loved",   bg:"semantic/success-bg", stroke:"semantic/success",tc:"text/primary",  emoji:"❤️", label:"Loved it"},
  {name:"State=Good",    bg:"brand/ember-glow",    stroke:"brand/ember-dim", tc:"text/primary",  emoji:"👍", label:"Pretty good"},
  {name:"State=Skip",    bg:"semantic/error-bg",   stroke:"semantic/error",  tc:"text/primary",  emoji:"👎", label:"Not again"},
];
const ratingComps = [];
for (const v of RATING_V) {
  const c = MC(v.name);
  c.resize(320, 68);
  c.counterAxisSizingMode = "FIXED";
  c.counterAxisFixedSize = 68;
  c.paddingLeft = c.paddingRight = 16;
  c.itemSpacing = 14;
  c.cornerRadius = 16;
  applyV(c, v.bg);
  applyVStroke(c, v.stroke, 1.5);
  const em = await T(v.emoji, F.body, 24, "text/primary");
  const lbl = await T(v.label, F.bodyMed, 15, v.tc);
  c.appendChild(em); c.appendChild(lbl);
  ratingComps.push(c);
}
const ratingSet = wrapSet(ratingComps, "Rating Card", "VERTICAL");
gap(ratingSet.height + 48);

// ── Timer Card ────────────────────────────────────────────────────────────────
const timerL = await T("Timer Card", F.bodySemi, 14, "text/primary");
addToPage(timerL); gap(24);

const TIMER_V = [
  {name:"State=Idle",    bg:"bg/raised",   stroke:"border/default", val:"05:00", state:"5 min timer", btnLbl:"Start",  btnBg:"brand/ember"},
  {name:"State=Running", bg:"bg/raised",   stroke:"brand/ember-dim",val:"04:32", state:"Running",     btnLbl:"Pause",  btnBg:"bg/overlay"},
  {name:"State=Done",    bg:"semantic/success-bg",stroke:"semantic/success",val:"00:00",state:"✓ Done",btnLbl:"",       btnBg:null},
];
const timerComps = [];
for (const v of TIMER_V) {
  const c = MC(v.name);
  c.resize(300, 68);
  c.counterAxisSizingMode = "FIXED";
  c.counterAxisFixedSize = 68;
  c.paddingLeft = c.paddingRight = 16;
  c.cornerRadius = 14;
  applyV(c, v.bg);
  applyVStroke(c, v.stroke, 1);

  const left = figma.createFrame();
  left.name = "left";
  left.layoutMode = "VERTICAL";
  left.itemSpacing = 2;
  left.primaryAxisSizingMode = "AUTO";
  left.counterAxisSizingMode = "AUTO";
  left.fills = [];
  left.layoutGrow = 1;

  const stateT = await T(v.state, F.monoMed, 10, "text/tertiary", {upper:true, ls:1.2});
  const valT = await T(v.val, F.monoMed, 30, v.name.includes("Done") ? "semantic/success" : "brand/ember");
  left.appendChild(stateT); left.appendChild(valT);
  c.appendChild(left);

  if (v.btnLbl && v.btnBg) {
    const btn = BOX("btn", 80, 40, v.btnBg, 10);
    const btnT = await T(v.btnLbl, F.bodySemi, 13, "text/inverse");
    btn.layoutMode = "HORIZONTAL";
    btn.primaryAxisAlignItems = "CENTER";
    btn.counterAxisAlignItems = "CENTER";
    btn.appendChild(btnT);
    c.appendChild(btn);
  }

  timerComps.push(c);
}
const timerSet = wrapSet(timerComps, "Timer Card");
gap(timerSet.height + 48);

// ── 11. iOS HIG Notes section ─────────────────────────────────────────────────
await sectionEyebrow("06 — iOS HIG Guidelines");
await sectionTitle("Platform Conventions");

const hig = [
  "✓ Minimum touch target: 44×44pt — all interactive elements comply",
  "✓ Safe area: 59pt top (Dynamic Island) · 34pt bottom (Home Indicator) · 16pt sides",
  "✓ Navigation: Stack navigation (← Back) rather than tab bar at this app scale",
  "✓ Typography: Using SF Pro conventions — no ALL-CAPS except labels/eyebrows",
  "✓ Haptics: Trigger on button press (impactFeedback.medium), timer end (notificationFeedback.success)",
  "✓ Dark mode: All tokens are dark-mode first — Mise is dark-native",
  "✓ Motion: Spring animations match iOS physics (stiffness 300, damping 22)",
  "✓ Sheet presentations: Use bottom sheet pattern for dialogs (timer prompt, finish dialog)",
];
for (const line of hig) {
  const t = await T(line, F.body, 13, "text/secondary");
  addToPage(t); gap(t.height + 8);
}
gap(32);

// ── 12. App Screens (390×844 iPhone 15 Pro) ──────────────────────────────────
await sectionEyebrow("07 — App Screens");
await sectionTitle("iPhone 15 Pro · 390×844pt");

const SW = 390, SH = 844, SG = 48;
let sX = 0; const sY = Y;

// ── Home screen ───────────────────────────────────────────────────────────────
const home = figma.createComponent();
home.name = "Screen/Home";
home.resize(SW, SH);
applyV(home, "bg/base");
home.cornerRadius = 40;
applyVStroke(home, "border/subtle", 1);
home.x = sX; home.y = sY; page.appendChild(home);

// Dynamic Island
const di = BOX("dynamic-island", 120, 34, "bg/base", 17);
di.x = (SW - 120) / 2; di.y = 10; home.appendChild(di);

const wm = await T("Mise", F.display, 48, "text/primary");
const dot = await T(".", F.display, 48, "brand/ember");
wm.x = 28; wm.y = 64; home.appendChild(wm);
dot.x = 28 + wm.width - 4; dot.y = 64; home.appendChild(dot);

const tg = await T("What are you making tonight?", F.body, 16, "text/secondary");
tg.x = 28; tg.y = 120; home.appendChild(tg);

const mc = BOX("cta-primary", 334, 96, "brand/ember", 20);
mc.x = 28; mc.y = 156; home.appendChild(mc);
const mcIcon = BOX("icon", 48, 48, "brand/ember-dim", 24);
mcIcon.x = 14; mcIcon.y = 24; mc.appendChild(mcIcon);
const mcIconT = await T("🍽️", F.body, 24, "text/primary");
mcIconT.x = 12; mcIconT.y = 12; mcIcon.appendChild(mcIconT);
const mcT = await T("Just cook something", F.display, 22, "text/inverse");
mcT.x = 72; mcT.y = 18; mc.appendChild(mcT);
const mcS = await T("Best match from what you have", F.body, 12, "text/inverse");
mcS.x = 72; mcS.y = 50; mc.appendChild(mcS);

const kr = BOX("kitchen-row", 334, 56, "bg/surface", 14);
applyVStroke(kr, "border/default", 1);
kr.x = 28; kr.y = 268; home.appendChild(kr);
const krT = await T("Update my kitchen", F.body, 14, "text/secondary");
krT.x = 16; krT.y = 18; kr.appendChild(krT);
const krBadge = BOX("badge", 68, 26, "brand/ember", 999);
krBadge.x = 250; krBadge.y = 15; kr.appendChild(krBadge);
const krBadgeT = await T("18 items", F.bodySemi, 10, "text/inverse");
krBadgeT.x = 8; krBadgeT.y = 7; krBadge.appendChild(krBadgeT);

// Home indicator
const homeInd = BOX("home-indicator", 134, 5, "text/tertiary", 99);
homeInd.x = (SW - 134) / 2; homeInd.y = SH - 20; home.appendChild(homeInd);

const hL = await T("Home", F.bodySemi, 12, "text/primary");
hL.x = sX; hL.y = sY + SH + 12; page.appendChild(hL);
sX += SW + SG;

// ── Cook Mode screen ──────────────────────────────────────────────────────────
const cook = figma.createComponent();
cook.name = "Screen/Cook Mode";
cook.resize(SW, SH);
applyV(cook, "bg/base");
cook.cornerRadius = 40;
applyVStroke(cook, "border/subtle", 1);
cook.x = sX; cook.y = sY; page.appendChild(cook);

// Progress bar segments
const segW = Math.floor((SW - 56 - 5 * 3) / 6);
for (let i = 0; i < 6; i++) {
  const seg = BOX(`seg-${i}`, segW, 3, i < 2 ? "brand/ember" : i === 2 ? "brand/ember-dim" : "bg/overlay", 99);
  seg.x = 28 + i * (segW + 3); seg.y = 56; cook.appendChild(seg);
}
const cookStep = await T("STEP 3 OF 6", F.monoMed, 10, "text/tertiary", {ls:1.2, upper:true});
cookStep.x = 148; cookStep.y = 68; cook.appendChild(cookStep);

const ghostNum = await T("03", F.display, 110, "bg/surface");
ghostNum.x = 210; ghostNum.y = 90; cook.appendChild(ghostNum);

const instr = await T("Heat olive oil in a pan over high heat until it shimmers.", F.bodySemi, 22, "text/primary", {lh:140});
instr.x = 28; instr.y = 172; cook.appendChild(instr);

// Step title
const stepTitle = await T("Heat oil…", F.display, 16, "brand/ember-text");
stepTitle.x = 28; stepTitle.y = 152; cook.appendChild(stepTitle);

// Timer card
const timerCard = BOX("timer-card", 334, 68, "bg/raised", 14);
applyVStroke(timerCard, "border/default", 1);
timerCard.x = 28; timerCard.y = 340; cook.appendChild(timerCard);
const tVal = await T("06:00", F.monoMed, 30, "brand/ember");
tVal.x = 14; tVal.y = 18; timerCard.appendChild(tVal);
const tBtn = BOX("start-btn", 88, 40, "brand/ember", 10);
tBtn.x = 230; tBtn.y = 14; timerCard.appendChild(tBtn);
const tBtnT = await T("▶ Start", F.bodySemi, 13, "text/inverse");
tBtnT.x = 14; tBtnT.y = 12; tBtn.appendChild(tBtnT);

// Nav buttons
const navBack = BOX("btn-back", 150, 52, "bg/surface", 14);
applyVStroke(navBack, "border/default", 1);
navBack.x = 28; navBack.y = SH - 100; cook.appendChild(navBack);
const navBackT = await T("← Back", F.bodyMed, 14, "text/secondary");
navBackT.x = 44; navBackT.y = 16; navBack.appendChild(navBackT);

const navNext = BOX("btn-next", 160, 52, "brand/ember", 14);
navNext.x = 200; navNext.y = SH - 100; cook.appendChild(navNext);
const navNextT = await T("Next →", F.bodySemi, 15, "text/inverse");
navNextT.x = 44; navNextT.y = 16; navNext.appendChild(navNextT);

// Home indicator
const cookInd = BOX("home-indicator", 134, 5, "text/tertiary", 99);
cookInd.x = (SW - 134) / 2; cookInd.y = SH - 20; cook.appendChild(cookInd);

const cL = await T("Cook Mode", F.bodySemi, 12, "text/primary");
cL.x = sX; cL.y = sY + SH + 12; page.appendChild(cL);
sX += SW + SG;

// ── Feedback screen ───────────────────────────────────────────────────────────
const feed = figma.createComponent();
feed.name = "Screen/Feedback";
feed.resize(SW, SH);
applyV(feed, "bg/base");
feed.cornerRadius = 40;
applyVStroke(feed, "border/subtle", 1);
feed.x = sX; feed.y = sY; page.appendChild(feed);

const feedEmoji = await T("🍽️", F.body, 44, "text/primary");
feedEmoji.x = 28; feedEmoji.y = 120; feed.appendChild(feedEmoji);
const feedTitle = await T("How was Aglio e Olio Salmon?", F.display, 28, "text/primary", {lh:115});
feedTitle.x = 28; feedTitle.y = 180; feed.appendChild(feedTitle);
const feedSub = await T("Your feedback helps Mise suggest better recipes.", F.body, 14, "text/secondary");
feedSub.x = 28; feedSub.y = 260; feed.appendChild(feedSub);

const ratings = [
  {emoji:"❤️", label:"Loved it",          sub:"Adding to rotation",     bg:"semantic/success-bg", stroke:"semantic/success"},
  {emoji:"👍", label:"Pretty good",        sub:"I'd make it again",      bg:"brand/ember-glow",    stroke:"brand/ember-dim"},
  {emoji:"👎", label:"Not making this again",sub:"Won't suggest again",  bg:"bg/surface",          stroke:"border/default"},
];
let rY = 300;
for (const r of ratings) {
  const card = BOX(`rating-${r.label}`, 334, 80, r.bg, 20);
  applyVStroke(card, r.stroke, 2);
  card.x = 28; card.y = rY; feed.appendChild(card);
  const rEmoji = await T(r.emoji, F.body, 30, "text/primary");
  rEmoji.x = 16; rEmoji.y = 24; card.appendChild(rEmoji);
  const rLabel = await T(r.label, F.bodySemi, 15, "text/primary");
  rLabel.x = 60; rLabel.y = 18; card.appendChild(rLabel);
  const rSub = await T(r.sub, F.body, 12, "text/tertiary");
  rSub.x = 60; rSub.y = 40; card.appendChild(rSub);
  rY += 92;
}

const feedBtn = BOX("save-btn", 334, 56, "brand/ember", 18);
feedBtn.x = 28; feedBtn.y = 760; feed.appendChild(feedBtn);
const feedBtnT = await T("Save feedback →", F.bodySemi, 15, "text/inverse");
feedBtnT.x = 108; feedBtnT.y = 17; feedBtn.appendChild(feedBtnT);

const feedInd = BOX("home-indicator", 134, 5, "text/tertiary", 99);
feedInd.x = (SW - 134) / 2; feedInd.y = SH - 20; feed.appendChild(feedInd);

const fL = await T("Feedback", F.bodySemi, 12, "text/primary");
fL.x = sX; fL.y = sY + SH + 12; page.appendChild(fL);

Y = sY + SH + 60;

// ── Done ──────────────────────────────────────────────────────────────────────
const done = await T("✅  Mise iOS Design System — Variables · Tokens · Typography · Spacing · Radius · 5 Component sets · 3 Screen templates · HIG notes", F.bodyMed, 14, "semantic/success");
done.x = 0; done.y = Y; page.appendChild(done);

figma.viewport.scrollAndZoomIntoView(page.children);
figma.notify("✅ Mise iOS Design System complete — Variables, tokens, components, screens");

})();
