// ══════════════════════════════════════════════════════════════════════════
// MISE · Android Design System
// Material Design 3 · Token-based · Atomic components · Auto-layout
// File: Mise — Android Design System (pzJKUdynHBbqqJrUxmqcAg)
// Paste into Figma › Plugins › Development › Open Console
// ══════════════════════════════════════════════════════════════════════════

(async () => {

const FONT_PAIRS = [
  ["Fraunces","Light"],["Fraunces","Regular"],
  ["DM Sans","Regular"],["DM Sans","Medium"],["DM Sans","SemiBold"],["DM Sans","Bold"],
  ["DM Mono","Regular"],["DM Mono","Medium"],
  ["Inter","Regular"],["Inter","Medium"],["Inter","Semi Bold"],["Inter","Bold"],
];
for (const [f,s] of FONT_PAIRS) { try { await figma.loadFontAsync({family:f,style:s}); } catch {} }

const F = {
  display:  {family:"Fraunces",style:"Light"},
  body:     {family:"DM Sans",style:"Regular"},
  bodyMed:  {family:"DM Sans",style:"Medium"},
  bodySemi: {family:"DM Sans",style:"SemiBold"},
  bodyBold: {family:"DM Sans",style:"Bold"},
  mono:     {family:"DM Mono",style:"Regular"},
  monoMed:  {family:"DM Mono",style:"Medium"},
};
const safe = (f) => { try { return f; } catch { return {family:"Inter",style:"Regular"}; } };

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
};

const page = figma.currentPage;
page.name = "Mise Android Design System";
for (const n of [...page.children]) n.remove();

// Variable collections — same tokens, Android-adapted naming
const colColl = figma.variables.createVariableCollection("🎨 MD3 Colour Tokens");
const mode = colColl.modes[0].modeId;
colColl.renameMode(mode, "Dark");

// MD3 role mapping → Mise tokens
const MD3_TOKENS = {
  "sys/color/background":        C.bgBase,
  "sys/color/surface":           C.bgSurface,
  "sys/color/surface-container": C.bgRaised,
  "sys/color/surface-variant":   C.bgOverlay,
  "sys/color/on-background":     C.textPrimary,
  "sys/color/on-surface":        C.textSecondary,
  "sys/color/outline":           C.borderDefault,
  "sys/color/outline-variant":   C.borderSubtle,
  "sys/color/primary":           C.ember,
  "sys/color/on-primary":        C.textInverse,
  "sys/color/primary-container": C.emberGlow,
  "sys/color/on-primary-container": C.emberText,
  "sys/color/secondary":         C.emberDim,
  "sys/color/error":             C.error,
  "sys/color/error-container":   C.errorBg,
  "sys/color/on-error-container":C.error,
};

const tokenVars = {};
for (const [name, rgb] of Object.entries(MD3_TOKENS)) {
  const v = figma.variables.createVariable(name, colColl, "COLOR");
  v.setValueForMode(mode, {...rgb, a:1});
  tokenVars[name] = v;
  // Also add Mise alias
  const miseName = name.replace("sys/color/","brand/").replace("background","base").replace("surface-container","raised").replace("surface-variant","overlay").replace("on-background","text/primary").replace("on-surface","text/secondary").replace("primary-container","ember-glow").replace("on-primary-container","ember-text").replace("primary","ember");
}

// Spacing — M3 uses 4dp baseline grid
const spaceColl = figma.variables.createVariableCollection("📐 M3 Spacing (4dp grid)");
const spaceMode = spaceColl.modes[0].modeId;
spaceColl.renameMode(spaceMode, "Base");
const M3_SPACING = {
  "spacing/4":4,"spacing/8":8,"spacing/12":12,"spacing/16":16,
  "spacing/20":20,"spacing/24":24,"spacing/32":32,"spacing/40":40,
  "spacing/48":48,"spacing/64":64,
};
for (const [n,v] of Object.entries(M3_SPACING)) {
  const sv = figma.variables.createVariable(n, spaceColl, "FLOAT");
  sv.setValueForMode(spaceMode, v);
}

// M3 Shape tokens — different from iOS
const shapeColl = figma.variables.createVariableCollection("🔄 M3 Shape Tokens");
const shapeMode = shapeColl.modes[0].modeId;
shapeColl.renameMode(shapeMode, "Base");
const M3_SHAPES = {
  "shape/extra-small": 4,  // Chips, small items
  "shape/small":       8,  // Buttons, text fields
  "shape/medium":      12, // Cards
  "shape/large":       16, // Dialogs, sheets
  "shape/extra-large": 28, // FAB, large cards
  "shape/full":        999, // Pills, badges
};
for (const [n,v] of Object.entries(M3_SHAPES)) {
  const sv = figma.variables.createVariable(n, shapeColl, "FLOAT");
  sv.setValueForMode(shapeMode, v);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function applyC(node, rgb) {
  node.fills = [{type:"SOLID", color:rgb}];
}
function applyStroke(node, rgb, w=1) {
  node.strokes = [{type:"SOLID", color:rgb}];
  node.strokeWeight = w; node.strokeAlign = "INSIDE";
}
async function T(str, font, size, rgb, opts={}) {
  const t = figma.createText();
  try { t.fontName = safe(font); } catch { t.fontName = {family:"Inter",style:"Regular"}; }
  t.fontSize = size; t.characters = String(str);
  applyC(t, rgb);
  if (opts.ls) t.letterSpacing = {unit:"PIXELS",value:opts.ls};
  if (opts.lh) t.lineHeight = {unit:"PERCENT",value:opts.lh};
  if (opts.upper) t.characters = t.characters.toUpperCase();
  return t;
}
function BOX(name, w, h, rgb, radius=0) {
  const f = figma.createFrame();
  f.name = name; f.resize(w,h); f.cornerRadius = radius;
  if (rgb) applyC(f, rgb); else f.fills = [];
  return f;
}
function MC(name) {
  const c = figma.createComponent();
  c.name = name; c.layoutMode = "HORIZONTAL";
  c.primaryAxisAlignItems = "CENTER";
  c.counterAxisAlignItems = "CENTER";
  c.primaryAxisSizingMode = "AUTO";
  c.counterAxisSizingMode = "AUTO";
  return c;
}

let Y = 0;
const addP = (node, x=0) => { node.x = x; node.y = Y; page.appendChild(node); };
const gap = h => { Y += h; };

// ── Cover ─────────────────────────────────────────────────────────────────────
const cover = BOX("🔖 Cover", 1800, 320, C.bgBase, 0);
addP(cover); gap(360);
const cvT = await T("Mise", F.display, 80, C.textPrimary);
const cvD = await T(".", F.display, 80, C.ember);
cvT.x = 64; cvT.y = 64; cover.appendChild(cvT);
cvD.x = 64 + cvT.width - 4; cvD.y = 64; cover.appendChild(cvD);
const cvS = await T("Android Design System · Material Design 3 · Token-based · Atomic", F.bodyMed, 18, C.textSecondary);
const cvTag = await T("MD3 Compliant · Dark Mode · Fraunces + DM Sans · 360×800dp", F.mono, 12, C.textTertiary);
cvS.x = 64; cvS.y = 172; cover.appendChild(cvS);
cvTag.x = 64; cvTag.y = 206; cover.appendChild(cvTag);
const cvBadge = BOX("badge", 200, 32, C.emberGlow, 999);
applyStroke(cvBadge, C.emberDim, 1);
cvBadge.x = 64; cvBadge.y = 244; cover.appendChild(cvBadge);
const cvBT = await T("Material Design 3 · Dark · v1.0", F.monoMed, 11, C.emberText);
cvBT.x = 16; cvBT.y = 9; cvBadge.appendChild(cvBT);

// ── Eyebrow / heading helpers ─────────────────────────────────────────────────
async function sE(label) { const t = await T(label, F.monoMed, 11, C.textTertiary, {upper:true, ls:1.4}); addP(t); gap(22); }
async function sH(label) { const t = await T(label, F.display, 36, C.textPrimary); addP(t); gap(56); }

// ── MD3 Color Role Mapping table ──────────────────────────────────────────────
await sE("01 — MD3 Colour Role Mapping");
await sH("Material Design 3 · Colour System");

const roleNote = await T("Mise uses standard MD3 colour roles, mapped to warm ember-based dark theme. Surface, Primary, and Error roles are all present.", F.body, 14, C.textSecondary);
addP(roleNote); gap(roleNote.height + 24);

const TOKEN_ROWS = [
  {md3:"primary",            mise:"brand/ember",     hex:"#E8751A", use:"CTA buttons, key actions"},
  {md3:"on-primary",         mise:"text/inverse",    hex:"#0F0E0C", use:"Text on primary buttons"},
  {md3:"primary-container",  mise:"brand/ember-glow",hex:"#2E1A08", use:"Chip backgrounds, tinted surfaces"},
  {md3:"on-primary-container",mise:"brand/ember-text",hex:"#F5A55A",use:"Text on primary containers"},
  {md3:"background",         mise:"bg/base",         hex:"#0F0E0C", use:"Main screen background"},
  {md3:"surface",            mise:"bg/surface",      hex:"#1A1916", use:"Cards, sheets, dialogs"},
  {md3:"surface-container",  mise:"bg/raised",       hex:"#242220", use:"Elevated cards, nav bar"},
  {md3:"outline",            mise:"border/default",  hex:"#3D3B37", use:"Input borders, dividers"},
  {md3:"outline-variant",    mise:"border/subtle",   hex:"#2E2C29", use:"Subtle separators"},
  {md3:"error",              mise:"semantic/error",  hex:"#C94040", use:"Error states"},
  {md3:"error-container",    mise:"semantic/error-bg",hex:"#2A0D0D",use:"Error backgrounds"},
];

const tableFrame = figma.createFrame();
tableFrame.name = "MD3 Role Table";
tableFrame.layoutMode = "VERTICAL";
tableFrame.itemSpacing = 1;
tableFrame.primaryAxisSizingMode = "AUTO";
tableFrame.counterAxisSizingMode = "AUTO";
tableFrame.fills = [];
tableFrame.x = 0; tableFrame.y = Y;
page.appendChild(tableFrame);

for (const r of TOKEN_ROWS) {
  const row = figma.createFrame();
  row.name = r.md3;
  row.layoutMode = "HORIZONTAL";
  row.counterAxisAlignItems = "CENTER";
  row.itemSpacing = 0;
  row.resize(1100, 44);
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "FIXED";
  applyC(row, C.bgSurface);

  const swatch = BOX("swatch", 44, 44, null, 0);
  const hex = parseInt(r.hex.slice(1), 16);
  applyC(swatch, {r:((hex>>16)&255)/255, g:((hex>>8)&255)/255, b:(hex&255)/255});
  swatch.resize(44, 44);

  const cells = [
    {txt: r.md3,  w:220, font:F.monoMed, size:12, c:C.textPrimary},
    {txt: r.mise, w:220, font:F.mono,    size:11, c:C.emberText},
    {txt: r.hex,  w:120, font:F.mono,    size:11, c:C.textTertiary},
    {txt: r.use,  w:440, font:F.body,    size:12, c:C.textSecondary},
  ];

  row.appendChild(swatch);
  for (const cell of cells) {
    const cellF = figma.createFrame();
    cellF.resize(cell.w, 44);
    cellF.layoutMode = "HORIZONTAL";
    cellF.counterAxisAlignItems = "CENTER";
    cellF.paddingLeft = 12; cellF.paddingRight = 12;
    cellF.fills = [];
    const cellT = await T(cell.txt, cell.font, cell.size, cell.c);
    cellF.appendChild(cellT);
    row.appendChild(cellF);
  }
  tableFrame.appendChild(row);
}
gap(tableFrame.height + 48);

// ── Typography — M3 Type Scale ────────────────────────────────────────────────
await sE("02 — M3 Typography Scale");
await sH("Type Scale");

const M3_TYPO = [
  {role:"Display Large",   font:F.display,  size:57, weight:400, c:C.textPrimary,   sample:"Cook something different"},
  {role:"Display Medium",  font:F.display,  size:45, weight:400, c:C.textPrimary,   sample:"Just cook something tonight"},
  {role:"Display Small",   font:F.display,  size:36, weight:400, c:C.textPrimary,   sample:"What's in your kitchen?"},
  {role:"Headline Large",  font:F.bodySemi, size:32, weight:600, c:C.textPrimary,   sample:"Soy-glazed chicken with garlic rice"},
  {role:"Headline Medium", font:F.bodySemi, size:28, weight:600, c:C.textPrimary,   sample:"Chicken and potato traybake"},
  {role:"Headline Small",  font:F.bodySemi, size:24, weight:600, c:C.textPrimary,   sample:"What proteins do you have?"},
  {role:"Title Large",     font:F.bodySemi, size:22, weight:500, c:C.textPrimary,   sample:"Just cook something"},
  {role:"Title Medium",    font:F.bodyMed,  size:16, weight:500, c:C.textPrimary,   sample:"Best match from what you have"},
  {role:"Title Small",     font:F.bodyMed,  size:14, weight:500, c:C.textSecondary, sample:"Update my kitchen"},
  {role:"Body Large",      font:F.body,     size:16, weight:400, c:C.textSecondary, sample:"Sticky caramelised chicken over garlic-fried rice. One pan, 25 minutes."},
  {role:"Body Medium",     font:F.body,     size:14, weight:400, c:C.textSecondary, sample:"Tap everything you have right now. This drives your recipes."},
  {role:"Body Small",      font:F.body,     size:12, weight:400, c:C.textTertiary,  sample:"3 items missing · Updated 2 days ago"},
  {role:"Label Large",     font:F.bodySemi, size:14, weight:600, c:C.textTertiary,  sample:"PANTRY STAPLES", upper:true, ls:1.4},
  {role:"Label Medium",    font:F.bodySemi, size:12, weight:600, c:C.textTertiary,  sample:"PROTEINS · STEP 2 OF 6", upper:true, ls:1.2},
  {role:"Label Small",     font:F.monoMed,  size:11, weight:500, c:C.emberText,     sample:"05:00 · DM Mono · timers"},
];

for (const t of M3_TYPO) {
  const row = figma.createFrame();
  row.name = t.role;
  row.layoutMode = "HORIZONTAL";
  row.counterAxisAlignItems = "CENTER";
  row.itemSpacing = 40; row.fills = [];
  row.x = 0; row.y = Y; page.appendChild(row);

  const roleL = await T(t.role, F.monoMed, 10, C.textTertiary);
  roleL.resize(200, roleL.height);
  roleL.textAutoResize = "HEIGHT";
  row.appendChild(roleL);

  const sizeL = await T(`${t.size}sp`, F.mono, 10, C.emberText);
  sizeL.resize(48, sizeL.height);
  row.appendChild(sizeL);

  const sampleT = await T(t.sample, t.font, t.size, t.c, {upper:t.upper, ls:t.ls});
  row.appendChild(sampleT);
  gap(row.height + 16);
}
gap(32);

// ── M3 Shape Scale ────────────────────────────────────────────────────────────
await sE("03 — M3 Shape Scale");
await sH("Shape Tokens");

const shapeNote = await T("M3 shape tokens differ from iOS — extra-small (4) to extra-large (28). Use shape/small (8dp) for buttons, shape/medium (12dp) for cards.", F.body, 13, C.textSecondary);
addP(shapeNote); gap(shapeNote.height + 28);

const shapeRow = figma.createFrame();
shapeRow.name = "shape-scale";
shapeRow.layoutMode = "HORIZONTAL";
shapeRow.itemSpacing = 24;
shapeRow.counterAxisAlignItems = "CENTER";
shapeRow.primaryAxisSizingMode = "AUTO";
shapeRow.counterAxisSizingMode = "AUTO";
shapeRow.fills = [];
shapeRow.x = 0; shapeRow.y = Y; page.appendChild(shapeRow);

for (const [name, val] of Object.entries(M3_SHAPES)) {
  const col = figma.createFrame();
  col.name = name; col.layoutMode = "VERTICAL";
  col.counterAxisAlignItems = "CENTER"; col.itemSpacing = 8;
  col.primaryAxisSizingMode = "AUTO"; col.counterAxisSizingMode = "AUTO";
  col.fills = [];
  const sq = BOX("shape", 80, 80, C.bgSurface, Math.min(val,40));
  applyStroke(sq, C.ember, 2);
  const nL = await T(name.replace("shape/",""), F.monoMed, 10, C.textPrimary);
  const vL = await T(val === 999 ? "∞" : `${val}dp`, F.mono, 10, C.textTertiary);
  col.appendChild(sq); col.appendChild(nL); col.appendChild(vL);
  shapeRow.appendChild(col);
}
gap(shapeRow.height + 64);

// ── Components ────────────────────────────────────────────────────────────────
await sE("04 — Components");
await sH("M3 Atomic Components");

function wrapSet(comps, label, dir="HORIZONTAL") {
  const set = figma.combineAsVariants(comps, page);
  set.name = label; set.x = 0; set.y = Y;
  applyC(set, C.bgBase);
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

// ── M3 Button Component Set (Filled/Outlined/Text/Tonal) ─────────────────────
const btnLabel = await T("Button · M3 Types", F.bodySemi, 14, C.textPrimary);
addP(btnLabel); gap(24);

// M3 has: Filled, Tonal, Outlined, Text, Elevated buttons
const M3_BTN = [
  {name:"Type=Filled",   bg:C.ember,     tc:C.textInverse, stroke:null, label:"Find me something", h:40, px:24, r:999},
  {name:"Type=Tonal",    bg:C.emberGlow, tc:C.emberText,   stroke:null, label:"↻ Not this",        h:40, px:24, r:999},
  {name:"Type=Outlined", bg:null,        tc:C.ember,       stroke:C.ember, label:"Skip for now",   h:40, px:24, r:999},
  {name:"Type=Text",     bg:null,        tc:C.ember,       stroke:null, label:"Learn more",        h:40, px:12, r:999},
  {name:"Type=Filled,Size=Small", bg:C.ember, tc:C.textInverse, stroke:null, label:"Start", h:32, px:16, r:999},
];

const btnComps = [];
for (const v of M3_BTN) {
  const c = MC(v.name);
  c.paddingLeft = c.paddingRight = v.px;
  c.counterAxisSizingMode = "FIXED";
  c.counterAxisFixedSize = v.h;
  if (v.bg) applyC(c, v.bg); else c.fills = [];
  if (v.stroke) applyStroke(c, v.stroke, 1);
  c.cornerRadius = v.r;
  const t = await T(v.label, F.bodySemi, v.h <= 32 ? 12 : 14, v.tc);
  c.appendChild(t);
  btnComps.push(c);
}
const btnSet = wrapSet(btnComps, "Button");
gap(btnSet.height + 12);
const btnNote = await T("M3 button types: Filled (primary) · Tonal (secondary) · Outlined (alternative) · Text (low emphasis). Min 48dp touch target.", F.body, 11, C.textTertiary);
addP(btnNote); gap(48);

// ── M3 Chip ───────────────────────────────────────────────────────────────────
const chipL = await T("Chip · M3 Filter Chips", F.bodySemi, 14, C.textPrimary);
addP(chipL); gap(24);

const M3_CHIP = [
  {name:"State=Selected",     bg:C.emberGlow, tc:C.emberText,    stroke:C.ember,        label:"Chicken thighs"},
  {name:"State=Unselected",   bg:C.bgRaised,  tc:C.textSecondary,stroke:C.borderDefault, label:"Salmon"},
  {name:"State=Pre-selected", bg:C.bgOverlay, tc:C.emberText,    stroke:C.emberDim,     label:"Olive oil"},
  {name:"State=Disabled",     bg:C.bgBase,    tc:C.textTertiary, stroke:C.borderSubtle, label:"Removed"},
];
const chipComps = [];
for (const v of M3_CHIP) {
  const c = MC(v.name);
  c.paddingLeft = c.paddingRight = 16; c.paddingTop = c.paddingBottom = 8;
  c.itemSpacing = 8; c.cornerRadius = 8; // M3 chips use 8dp, not pill shape
  applyC(c, v.bg);
  applyStroke(c, v.stroke, 1);
  const t = await T(v.label, F.bodyMed, 14, v.tc);
  c.appendChild(t);
  chipComps.push(c);
}
const chipSet = wrapSet(chipComps, "Chip");
gap(chipSet.height + 48);

// ── M3 Text Field ─────────────────────────────────────────────────────────────
const inputL = await T("Text Field · M3 Filled/Outlined", F.bodySemi, 14, C.textPrimary);
addP(inputL); gap(24);

// M3 has filled (underline only) and outlined text fields
const M3_INPUT = [
  {name:"Type=Filled,State=Default",  bg:C.bgRaised,  tc:C.textTertiary, val:"Add something else…", underline:true},
  {name:"Type=Filled,State=Focused",  bg:C.bgRaised,  tc:C.textPrimary,  val:"Coconut milk",        underline:true, focused:true},
  {name:"Type=Outlined,State=Default",bg:C.bgBase,    tc:C.textTertiary, val:"Add something else…", outlined:true},
  {name:"Type=Outlined,State=Focused",bg:C.bgBase,    tc:C.textPrimary,  val:"Coconut milk",        outlined:true, focused:true},
];
const inputComps = [];
for (const v of M3_INPUT) {
  const c = figma.createComponent();
  c.name = v.name;
  c.resize(280, 56);
  applyC(c, v.bg);
  if (v.outlined) {
    c.cornerRadius = 4;
    applyStroke(c, v.focused ? C.ember : C.borderDefault, v.focused ? 2 : 1);
  } else {
    // Filled style — top corners rounded, bottom line only
    c.topLeftRadius = 4; c.topRightRadius = 4;
    c.bottomLeftRadius = 0; c.bottomRightRadius = 0;
    const underline = BOX("underline", 280, v.focused ? 2 : 1, v.focused ? C.ember : C.borderDefault, 0);
    underline.x = 0; underline.y = 55;
    c.appendChild(underline);
  }
  const label = await T("Ingredient", F.body, 12, v.focused ? C.ember : C.textTertiary);
  label.x = 16; label.y = 8;
  const val = await T(v.val, F.body, 16, v.tc);
  val.x = 16; val.y = 28;
  c.appendChild(label); c.appendChild(val);
  inputComps.push(c);
}
const inputSet = wrapSet(inputComps, "Text Field");
gap(inputSet.height + 48);

// ── M3 Navigation Bar ─────────────────────────────────────────────────────────
const navL = await T("Navigation Bar · M3 Bottom Nav", F.bodySemi, 14, C.textPrimary);
addP(navL); gap(24);

const navBar = figma.createComponent();
navBar.name = "Navigation Bar";
navBar.resize(360, 80);
applyC(navBar, C.bgRaised);
navBar.layoutMode = "HORIZONTAL";
navBar.primaryAxisAlignItems = "SPACE_BETWEEN";
navBar.counterAxisAlignItems = "CENTER";
navBar.paddingLeft = navBar.paddingRight = 8;
navBar.x = 0; navBar.y = Y; page.appendChild(navBar);

const NAV_ITEMS = [
  {icon:"🏠", label:"Home",    active:true},
  {icon:"📦", label:"Kitchen", active:false},
  {icon:"📖", label:"Journal", active:false},
];
for (const item of NAV_ITEMS) {
  const tab = figma.createFrame();
  tab.name = `tab-${item.label}`;
  tab.layoutMode = "VERTICAL";
  tab.primaryAxisAlignItems = "CENTER";
  tab.counterAxisAlignItems = "CENTER";
  tab.itemSpacing = 4;
  tab.resize(80, 64);
  tab.fills = [];

  if (item.active) {
    // M3 active indicator pill
    const indicator = BOX("indicator", 64, 32, C.emberGlow, 16);
    indicator.x = 8; indicator.y = 8;
    tab.appendChild(indicator);
    const iconT = await T(item.icon, F.body, 20, C.ember);
    iconT.x = (80 - iconT.width) / 2; iconT.y = 14;
    tab.appendChild(iconT);
  } else {
    const iconT = await T(item.icon, F.body, 20, C.textTertiary);
    iconT.x = (80 - iconT.width) / 2; iconT.y = 14;
    tab.appendChild(iconT);
  }
  const labelT = await T(item.label, F.bodyMed, 12, item.active ? C.ember : C.textTertiary);
  labelT.x = (80 - labelT.width) / 2; labelT.y = 46;
  tab.appendChild(labelT);
  navBar.appendChild(tab);
}
gap(navBar.height + 48);

// ── M3 Notes ──────────────────────────────────────────────────────────────────
await sE("05 — M3 Platform Guidelines");
await sH("Android · Material Design 3");

const M3_NOTES = [
  "✓ Touch targets: 48×48dp minimum — all interactive elements comply",
  "✓ Navigation: Bottom navigation bar for 3 destinations (Home, Kitchen, Journal)",
  "✓ Shape: Extra-small (4dp) to extra-large (28dp) — never use border-radius % on Android",
  "✓ Elevation: Use surface-container tokens for elevated surfaces, not shadows",
  "✓ Motion: M3 uses shared-axis transitions for navigation, fade for modals",
  "✓ Status bar: Transparent, edge-to-edge with WindowInsetsCompat.setDecorFitsSystemWindows(false)",
  "✓ Gesture navigation: 3-button or gesture — respect gestureInsets on bottom sheets",
  "✓ Typography: Android uses sp (scalable pixels) for text, dp for everything else",
  "✓ Dark mode: Follows system via AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM",
  "✓ Haptics: HapticFeedbackConstants.CONFIRM for primary actions, CLOCK_TICK for timer",
];
for (const note of M3_NOTES) {
  const t = await T(note, F.body, 13, C.textSecondary);
  addP(t); gap(t.height + 8);
}
gap(32);

// ── Android Screens (360×800dp) ───────────────────────────────────────────────
await sE("06 — Android Screens");
await sH("Pixel 7 · 360×800dp");

const SW=360, SH=800, SG=48;
let sX=0; const sY=Y;

// Home screen
const home = figma.createComponent();
home.name = "Screen/Home";
home.resize(SW, SH);
applyC(home, C.bgBase);
home.cornerRadius = 28; // M3 large device corners
applyStroke(home, C.borderSubtle, 1);
home.x = sX; home.y = sY; page.appendChild(home);

// Android status bar
const sb = BOX("status-bar", SW, 28, C.bgBase, 0);
sb.x = 0; sb.y = 0; home.appendChild(sb);
const sbT = await T("12:00", F.bodySemi, 12, C.textPrimary);
sbT.x = 16; sbT.y = 8; sb.appendChild(sbT);
const sbR = await T("▌▌▌", F.bodyMed, 12, C.textPrimary);
sbR.x = 304; sbR.y = 8; sb.appendChild(sbR);

const wm = await T("Mise", F.display, 44, C.textPrimary);
const dot = await T(".", F.display, 44, C.ember);
wm.x = 24; wm.y = 52; home.appendChild(wm);
dot.x = 24 + wm.width - 2; dot.y = 52; home.appendChild(dot);

const tg = await T("What are you making tonight?", F.body, 16, C.textSecondary);
tg.x = 24; tg.y = 108; home.appendChild(tg);

// M3 Filled button style CTA
const mc = BOX("cta-filled", 312, 88, C.ember, 28);
mc.x = 24; mc.y = 144; home.appendChild(mc);
const mcIcon = BOX("icon", 44, 44, C.emberDim, 22);
mcIcon.x = 12; mcIcon.y = 22; mc.appendChild(mcIcon);
const mcIconT = await T("🍽️", F.body, 22, C.textPrimary);
mcIconT.x = 11; mcIconT.y = 11; mcIcon.appendChild(mcIconT);
const mcT = await T("Just cook something", F.display, 20, C.textInverse);
mcT.x = 66; mcT.y = 16; mc.appendChild(mcT);
const mcS = await T("Best match from what you have", F.body, 12, C.textInverse);
mcS.x = 66; mcS.y = 44; mc.appendChild(mcS);

const kr = BOX("kitchen-surface", 312, 56, C.bgSurface, 12);
applyStroke(kr, C.borderDefault, 1);
kr.x = 24; kr.y = 248; home.appendChild(kr);
const krT = await T("Update my kitchen", F.body, 14, C.textSecondary);
krT.x = 16; krT.y = 18; kr.appendChild(krT);

// M3 Bottom nav
const bnav = BOX("bottom-nav", SW, 80, C.bgRaised, 0);
bnav.x = 0; bnav.y = SH - 80; home.appendChild(bnav);
const navItems = [{icon:"🏠",label:"Home",a:true},{icon:"📦",label:"Kitchen",a:false},{icon:"📖",label:"Journal",a:false}];
let nX = 8;
for (const ni of navItems) {
  const tab = BOX(`tab-${ni.label}`, 80, 64, null, 0);
  tab.x = nX; tab.y = 8; bnav.appendChild(tab);
  if (ni.a) {
    const ind = BOX("ind", 64, 32, C.emberGlow, 16);
    ind.x = 8; ind.y = 2; tab.appendChild(ind);
  }
  const iT = await T(ni.icon, F.body, 20, ni.a ? C.ember : C.textTertiary);
  iT.x = (80 - 20) / 2; iT.y = ni.a ? 6 : 16; tab.appendChild(iT);
  const lT = await T(ni.label, F.bodyMed, 11, ni.a ? C.ember : C.textTertiary);
  lT.x = (80 - lT.width) / 2; lT.y = 46; tab.appendChild(lT);
  nX += 104;
}

// Android gesture bar
const gestBar = BOX("gesture-indicator", 134, 5, C.textTertiary, 99);
gestBar.x = (SW - 134) / 2; gestBar.y = SH - 12; home.appendChild(gestBar);

const hL = await T("Home", F.bodySemi, 12, C.textPrimary);
hL.x = sX; hL.y = sY + SH + 12; page.appendChild(hL);
sX += SW + SG;

// Cook Mode — Android
const cook = figma.createComponent();
cook.name = "Screen/Cook Mode";
cook.resize(SW, SH);
applyC(cook, C.bgBase);
cook.cornerRadius = 28;
applyStroke(cook, C.borderSubtle, 1);
cook.x = sX; cook.y = sY; page.appendChild(cook);

const segW = Math.floor((SW - 48 - 5*3) / 6);
for (let i=0; i<6; i++) {
  const seg = BOX(`seg-${i}`, segW, 4, i<2?C.ember:i===2?C.emberDim:C.bgOverlay, 99);
  seg.x = 24 + i*(segW+3); seg.y = 44; cook.appendChild(seg);
}
const cS = await T("STEP 3 OF 6", F.monoMed, 10, C.textTertiary, {ls:1.2, upper:true});
cS.x = 128; cS.y = 56; cook.appendChild(cS);

const gN = await T("03", F.display, 100, C.bgSurface);
gN.x = 190; gN.y = 82; cook.appendChild(gN);

const stTitleA = await T("Heat oil…", F.display, 16, C.emberText);
stTitleA.x = 24; stTitleA.y = 146; cook.appendChild(stTitleA);

const instrA = await T("Heat olive oil in a pan over high heat until it shimmers.", F.bodySemi, 20, C.textPrimary, {lh:145});
instrA.x = 24; instrA.y = 172; cook.appendChild(instrA);

const timerA = BOX("timer", 312, 68, C.bgRaised, 12);
applyStroke(timerA, C.borderDefault, 1);
timerA.x = 24; timerA.y = 328; cook.appendChild(timerA);
const tVA = await T("06:00", F.monoMed, 30, C.ember);
tVA.x = 14; tVA.y = 18; timerA.appendChild(tVA);
const tBA = BOX("start", 88, 40, C.ember, 8);
tBA.x = 208; tBA.y = 14; timerA.appendChild(tBA);
const tBTA = await T("▶ Start", F.bodySemi, 13, C.textInverse);
tBTA.x = 12; tBTA.y = 12; tBA.appendChild(tBTA);

// M3 — text button back, filled button next
const backA = BOX("btn-back", 136, 48, null, 999);
applyStroke(backA, C.borderDefault, 1);
backA.x = 24; backA.y = SH - 144; cook.appendChild(backA);
const backTA = await T("← Back", F.bodyMed, 14, C.textSecondary);
backTA.x = 32; backTA.y = 16; backA.appendChild(backTA);

const nextA = BOX("btn-next", 148, 48, C.ember, 999);
nextA.x = 188; nextA.y = SH - 144; cook.appendChild(nextA);
const nextTA = await T("Next →", F.bodySemi, 14, C.textInverse);
nextTA.x = 40; nextTA.y = 16; nextA.appendChild(nextTA);

// Bottom nav
const bnavC = BOX("bottom-nav", SW, 80, C.bgRaised, 0);
bnavC.x = 0; bnavC.y = SH - 80; cook.appendChild(bnavC);
const gestC = BOX("gesture-indicator", 134, 5, C.textTertiary, 99);
gestC.x = (SW - 134) / 2; gestC.y = SH - 12; cook.appendChild(gestC);

const cL = await T("Cook Mode", F.bodySemi, 12, C.textPrimary);
cL.x = sX; cL.y = sY + SH + 12; page.appendChild(cL);

Y = sY + SH + 60;

// ── Done ──────────────────────────────────────────────────────────────────────
const done = await T("✅  Mise Android Design System — MD3 Colour roles · M3 Typography · Shape tokens · 4 Component sets · M3 Nav bar · 2 Screen templates · Platform notes", F.bodyMed, 14, C.success);
done.x = 0; done.y = Y; page.appendChild(done);

figma.viewport.scrollAndZoomIntoView(page.children);
figma.notify("✅ Mise Android Design System complete — MD3 tokens, components, screens");

})();
