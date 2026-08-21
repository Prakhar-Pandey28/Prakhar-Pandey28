#!/usr/bin/env node
/**
 * Renders assets/contrib-heatmap.svg — an animated GitHub contribution
 * calendar, self-contained (no third-party rendering service at view time).
 *
 * Contribution data comes from github-contributions-api.jogruber.de, a
 * public JSON wrapper over GitHub's own contribution calendar (no token
 * required). Re-run by .github/workflows/update-readme.yml on a daily cron
 * so the calendar stays current.
 *
 * Rendered as a self-contained dark card (own background, not transparent)
 * so it reads consistently regardless of the viewer's GitHub theme — same
 * choice the portfolio site itself makes (dark-only design).
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const USERNAME = "Prakhar-Pandey28";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "../assets/contrib-heatmap.svg");

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const CARD_PAD = 18;

const BG = "#0c0d10";
const BORDER = "#ffffff1f";
const MUTED = "#8b8b95";
const FONT = `font-family="ui-monospace,'JetBrains Mono',monospace" font-size="10" fill="${MUTED}"`;

// Violet accent, matching the portfolio site's brand color, at increasing opacity per level.
const LEVEL_COLOR = ["#2a2a31", "#8b7cff44", "#8b7cff77", "#8b7cffaa", "#8b7cff"];

async function fetchContributions() {
  const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${USERNAME}?y=last`);
  if (!res.ok) throw new Error(`contributions API returned ${res.status}`);
  const data = await res.json();
  return data.contributions.map((d) => ({
    date: d.date,
    count: d.count,
    level: Math.min(4, Math.max(0, d.level)),
  }));
}

function buildWeeks(days) {
  const firstDate = new Date(days[0].date + "T00:00:00Z");
  const leadingBlanks = firstDate.getUTCDay();
  const cells = [...Array.from({ length: leadingBlanks }, () => null), ...days];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function renderSvg(weeks, total) {
  const gridWidth = weeks.length * STEP - GAP;
  const width = CARD_PAD * 2 + gridWidth;
  const gridHeight = 7 * STEP - GAP;
  const legendRowHeight = 22;
  const height = CARD_PAD * 2 + gridHeight + legendRowHeight;

  let cellsMarkup = "";
  let i = 0;
  for (let w = 0; w < weeks.length; w++) {
    for (let d = 0; d < 7; d++) {
      const day = weeks[w][d];
      const x = CARD_PAD + w * STEP;
      const y = CARD_PAD + d * STEP;
      if (!day) continue;
      const delay = (i * 0.0035).toFixed(3);
      const title = `${day.count} contributions on ${day.date}`;
      cellsMarkup += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${LEVEL_COLOR[day.level]}" opacity="0"><title>${title}</title><animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur="0.35s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.2 1"/></rect>`;
      i++;
    }
  }

  const legendY = CARD_PAD + gridHeight + 14;

  // Total count on the left, Less/More legend on the right — kept at
  // opposite ends so they never collide regardless of digit count.
  let legendMarkup = `<text x="${CARD_PAD}" y="${legendY}" ${FONT}>${total} contributions, last 12 months</text>`;

  const legendGroupWidth = 28 /* "Less" */ + 6 + 5 * (CELL + 3) + 6 + 32 /* "More" */;
  const legendX = width - CARD_PAD - legendGroupWidth;
  legendMarkup += `<text x="${legendX}" y="${legendY}" ${FONT}>Less</text>`;
  const swatchStart = legendX + 28 + 6;
  for (let l = 0; l < 5; l++) {
    legendMarkup += `<rect x="${swatchStart + l * (CELL + 3)}" y="${legendY - 9}" width="${CELL}" height="${CELL}" rx="2.5" fill="${LEVEL_COLOR[l]}"/>`;
  }
  legendMarkup += `<text x="${swatchStart + 5 * (CELL + 3) + 6}" y="${legendY}" ${FONT}>More</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>Prakhar Pandey — GitHub contribution activity, last 12 months</title>
  <rect width="${width}" height="${height}" rx="14" fill="${BG}" stroke="${BORDER}"/>
  ${cellsMarkup}
  ${legendMarkup}
</svg>
`;
}

async function main() {
  const days = await fetchContributions();
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const weeks = buildWeeks(days);
  const svg = renderSvg(weeks, total);
  await writeFile(OUTPUT_PATH, svg, "utf-8");
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_PATH)} (${weeks.length} weeks, ${total} contributions)`);
}

main().catch((err) => {
  console.error("Heatmap generation failed:", err);
  process.exit(1);
});
