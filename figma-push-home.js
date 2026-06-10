/**
 * Mise — Home Screen Push to Figma
 * Run this in Figma via:
 *   Plugins → Development → New plugin (one-time setup)
 *   OR paste into the "Scripter" community plugin
 *
 * Creates a 390×844 Home Screen frame with full auto-layout,
 * matching the current web app design token system.
 */

// ── Design tokens (resolved from styles.css oklch values) ──────────────
const T = {
  bgBase:        { r: 0.075, g: 0.067, b: 0.059 }, // oklch(0.15 0.008 60)
  bgSurface:     { r: 0.106, g: 0.098, b: 0.086 }, // oklch(0.20 0.009 60)
  bgElevated:    { r: 0.133, g: 0.122, b: 0.110 }, // oklch(0.235 0.010 60)
  bgRaised:      { r: 0.165, g: 0.153, b: 0.137 }, // oklch(0.27 0.010 60)
  borderSubtle:  { r: 0.188, g: 0.176, b: 0.161 }, // oklch(0.31 0.011 60)
  textPrimary:   { r: 0.941, g: 0.929, b: 0.910 }, // #F0EDE8
  textSecondary: { r: 0.769, g: 0.749, b: 0.722 }, // #C4BFB8
  textTertiary:  { r: 0.600, g: 0.584, b: 0.565 }, // #999590 — 4.5:1 AA on bg-surface ✓
  ember:         { r: 1.000, g: 0.420, b: 0.208 }, // #FF6B35
  emberDim:      { r: 0.420, g: 0.239, b: 0.165 }, // #6B3D2A
  emberBadge:    { r: 1.000, g: 0.549, b: 0.314 }, // #FF8C5A
  ctaTitle:      { r: 0.047, g: 0.031, b: 0.024 }, // #0C0806 — 8.2:1 on ember ✓ WCAG AA
  ctaSub:        { r: 0.239, g: 0.094, b: 0.039 }, // #3D180A — 5.3:1 on ember ✓ WCAG AA
};

function solid(color, opacity = 1) {
  return [{ type: 'SOLID', color, opacity }];
}

// ── Load fonts ─────────────────────────────────────────────────────────
await Promise.all([
  figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
]);

// ── Helpers ────────────────────────────────────────────────────────────
function makeFrame(name, w, h) {
  const f = figma.createFrame();
  f.name = name;
  f.resize(w, h);
  f.fills = [];
  return f;
}

function makeText(chars, size, style, color, opts = {}) {
  const t = figma.createText();
  t.fontName = { family: 'Inter', style };
  t.characters = chars;
  t.fontSize = size;
  t.fills = solid(color);
  if (opts.letterSpacing) t.letterSpacing = { value: opts.letterSpacing, unit: 'PERCENT' };
  return t;
}

/** Vertical auto-layout frame */
function vStack(name, w, gap, padH = 0, padV = 0) {
  const f = makeFrame(name, w, 1);
  f.layoutMode = 'VERTICAL';
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'FIXED';
  f.itemSpacing = gap;
  f.paddingLeft = f.paddingRight = padH;
  f.paddingTop = f.paddingBottom = padV;
  return f;
}

/** Horizontal auto-layout frame */
function hStack(name, w, gap, padH = 0, padV = 0) {
  const f = makeFrame(name, w, 1);
  f.layoutMode = 'HORIZONTAL';
  f.primaryAxisSizingMode = 'FIXED';
  f.counterAxisSizingMode = 'AUTO';
  f.counterAxisAlignItems = 'CENTER';
  f.itemSpacing = gap;
  f.paddingLeft = f.paddingRight = padH;
  f.paddingTop = f.paddingBottom = padV;
  return f;
}

// ── 📱 Screen container ────────────────────────────────────────────────
const screen = makeFrame('📱 Home Screen', 390, 844);
screen.fills = solid(T.bgBase);
screen.layoutMode = 'VERTICAL';
screen.primaryAxisSizingMode = 'FIXED';
screen.counterAxisSizingMode = 'FIXED';
screen.paddingTop = 56;
screen.paddingBottom = 40;
screen.paddingLeft = screen.paddingRight = 20;
screen.itemSpacing = 24;
screen.clipsContent = true;

// ── Header ─────────────────────────────────────────────────────────────
const header = vStack('Header', 350, 8);
header.layoutSizingHorizontal = 'FILL';

const wordmark = makeText('Mise.', 46, 'Regular', T.textPrimary);
wordmark.setRangeFills(4, 5, solid(T.ember)); // ember dot
wordmark.layoutSizingHorizontal = 'FILL';
wordmark.textAutoResize = 'HEIGHT';

const greeting = makeText('☀️ Good morning', 15, 'Regular', T.textSecondary);
greeting.layoutSizingHorizontal = 'FILL';
greeting.textAutoResize = 'HEIGHT';

header.appendChild(wordmark);
header.appendChild(greeting);

// ── Hero CTA ───────────────────────────────────────────────────────────
const hero = hStack('Hero CTA', 350, 16, 20, 20);
hero.fills = solid(T.ember);
hero.cornerRadius = 16;
hero.effects = [{
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.55 },
  offset: { x: 0, y: 2 },
  radius: 10, spread: 0,
  visible: true, blendMode: 'NORMAL',
}];
hero.layoutSizingHorizontal = 'FILL';

const iconBubble = makeFrame('Icon', 56, 56);
iconBubble.cornerRadius = 14;
iconBubble.fills = solid({ r: 0, g: 0, b: 0 }, 0.18);
iconBubble.layoutMode = 'HORIZONTAL';
iconBubble.primaryAxisAlignItems = 'CENTER';
iconBubble.counterAxisAlignItems = 'CENTER';
iconBubble.primaryAxisSizingMode = 'FIXED';
iconBubble.counterAxisSizingMode = 'FIXED';
iconBubble.appendChild(makeText('🍽️', 28, 'Regular', T.textPrimary));

const ctaCol = vStack('CTA Text', 1, 4);
ctaCol.layoutSizingHorizontal = 'FILL';
ctaCol.layoutGrow = 1;

const ctaH = makeText('Just cook something', 22, 'Regular', T.ctaTitle);
ctaH.layoutSizingHorizontal = 'FILL';
ctaH.textAutoResize = 'HEIGHT';

const ctaS = makeText('Best match from your pantry →', 13, 'Regular', T.ctaSub);
ctaS.layoutSizingHorizontal = 'FILL';
ctaS.textAutoResize = 'HEIGHT';

ctaCol.appendChild(ctaH);
ctaCol.appendChild(ctaS);
hero.appendChild(iconBubble);
hero.appendChild(ctaCol);

// ── Last Cooked Card ───────────────────────────────────────────────────
const lcCard = hStack('Last Cooked Card', 350, 16, 16, 16);
lcCard.fills = solid(T.bgSurface);
lcCard.strokes = solid(T.borderSubtle);
lcCard.strokeWeight = 1;
lcCard.cornerRadius = 16;
lcCard.layoutSizingHorizontal = 'FILL';

const recipeBox = makeFrame('Recipe Icon', 48, 48);
recipeBox.cornerRadius = 12;
recipeBox.fills = solid(T.bgRaised);
recipeBox.layoutMode = 'HORIZONTAL';
recipeBox.primaryAxisAlignItems = 'CENTER';
recipeBox.counterAxisAlignItems = 'CENTER';
recipeBox.primaryAxisSizingMode = 'FIXED';
recipeBox.counterAxisSizingMode = 'FIXED';
recipeBox.appendChild(makeText('🥘', 24, 'Regular', T.textPrimary));

const lcCol = vStack('Text', 1, 2);
lcCol.layoutSizingHorizontal = 'FILL';
lcCol.layoutGrow = 1;

const lcLabel = makeText('LAST COOKED', 10, 'Semi Bold', T.ember, { letterSpacing: 8 });
lcLabel.layoutSizingHorizontal = 'FILL';
lcLabel.textAutoResize = 'HEIGHT';

const lcTitle = makeText('Spiced Lamb Kofta', 15, 'Medium', T.textPrimary);
lcTitle.layoutSizingHorizontal = 'FILL';
lcTitle.textAutoResize = 'HEIGHT';

lcCol.appendChild(lcLabel);
lcCol.appendChild(lcTitle);

const chevron = makeText('›', 20, 'Regular', T.textTertiary);

lcCard.appendChild(recipeBox);
lcCard.appendChild(lcCol);
lcCard.appendChild(chevron);

// ── Spacer (flex-grow) ─────────────────────────────────────────────────
const spacer = makeFrame('Spacer', 350, 8);
spacer.fills = [];
spacer.layoutSizingHorizontal = 'FILL';
spacer.layoutGrow = 1;

// ── Pantry Row ─────────────────────────────────────────────────────────
const pantryRow = hStack('🥡 Pantry Row', 350, 14, 16, 10);
pantryRow.fills = solid(T.bgSurface);
pantryRow.strokes = solid(T.borderSubtle);
pantryRow.strokeWeight = 1;
pantryRow.cornerRadius = 16;
pantryRow.layoutSizingHorizontal = 'FILL';

const pkgBox = makeFrame('Icon', 36, 36);
pkgBox.cornerRadius = 10;
pkgBox.fills = solid(T.bgRaised);
pkgBox.layoutMode = 'HORIZONTAL';
pkgBox.primaryAxisAlignItems = 'CENTER';
pkgBox.counterAxisAlignItems = 'CENTER';
pkgBox.primaryAxisSizingMode = 'FIXED';
pkgBox.counterAxisSizingMode = 'FIXED';
pkgBox.appendChild(makeText('📦', 16, 'Regular', T.textPrimary));

const pantryLabel = makeText('Update my kitchen', 14, 'Medium', T.textPrimary);
pantryLabel.layoutGrow = 1;
pantryLabel.layoutSizingHorizontal = 'FILL';
pantryLabel.textAutoResize = 'HEIGHT';

const badge = hStack('Badge', 1, 0, 10, 6);
badge.primaryAxisSizingMode = 'AUTO';
badge.cornerRadius = 99;
badge.fills = solid(T.ember, 0.14);
badge.strokes = solid(T.emberDim, 0.6);
badge.strokeWeight = 1;
badge.primaryAxisAlignItems = 'CENTER';
badge.counterAxisAlignItems = 'CENTER';
badge.appendChild(makeText('9 items', 11, 'Semi Bold', T.emberBadge));

pantryRow.appendChild(pkgBox);
pantryRow.appendChild(pantryLabel);
pantryRow.appendChild(badge);

// ── History Row ────────────────────────────────────────────────────────
const histRow = hStack('📖 History Row', 350, 14, 16, 10);
histRow.fills = solid(T.bgSurface);
histRow.strokes = solid(T.borderSubtle);
histRow.strokeWeight = 1;
histRow.cornerRadius = 16;
histRow.layoutSizingHorizontal = 'FILL';

const clockBox = makeFrame('Icon', 36, 36);
clockBox.cornerRadius = 10;
clockBox.fills = solid(T.bgRaised);
clockBox.layoutMode = 'HORIZONTAL';
clockBox.primaryAxisAlignItems = 'CENTER';
clockBox.counterAxisAlignItems = 'CENTER';
clockBox.primaryAxisSizingMode = 'FIXED';
clockBox.counterAxisSizingMode = 'FIXED';
clockBox.appendChild(makeText('⏰', 16, 'Regular', T.textPrimary));

const histLabel = makeText('My cooking journal', 14, 'Medium', T.textPrimary);
histLabel.layoutGrow = 1;
histLabel.layoutSizingHorizontal = 'FILL';
histLabel.textAutoResize = 'HEIGHT';

const histCount = makeText('1 recipe', 11, 'Regular', T.textTertiary);

histRow.appendChild(clockBox);
histRow.appendChild(histLabel);
histRow.appendChild(histCount);

// ── Assemble screen ────────────────────────────────────────────────────
screen.appendChild(header);
screen.appendChild(hero);
screen.appendChild(lcCard);
screen.appendChild(spacer);
screen.appendChild(pantryRow);
screen.appendChild(histRow);

// Place on canvas and zoom to it
screen.x = 100;
screen.y = 100;
figma.currentPage.selection = [screen];
figma.viewport.scrollAndZoomIntoView([screen]);
