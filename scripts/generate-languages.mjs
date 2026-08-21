#!/usr/bin/env node
/**
 * Renders assets/languages.svg — a top-languages bar chart built from the
 * public GitHub REST API (no token required for a public user's repo list).
 * Re-run daily by .github/workflows/update-readme.yml.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const USERNAME = "Prakhar-Pandey28";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "../assets/languages.svg");

const WIDTH = 320;
const CARD_PAD = 20;
const BAR_HEIGHT = 8;
const ROW_GAP = 26;
const BG = "#0c0d10";
const BORDER = "#ffffff1f";
const TRACK = "#ffffff14";
const ACCENT = "#8b7cff";
const FONT = `font-family="ui-monospace,'JetBrains Mono',monospace" font-size="11"`;

async function fetchRepos() {
  const res = await fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": `${USERNAME}-profile-readme` },
  });
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  return res.json();
}

function topLanguages(repos, limit = 5) {
  const counts = new Map();
  for (const r of repos) {
    if (!r.language || r.fork) continue;
    counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([language, count]) => ({ language, count, pct: count / total }));
}

function renderSvg(languages) {
  const height = CARD_PAD * 2 + 20 + languages.length * ROW_GAP;
  const barWidth = WIDTH - CARD_PAD * 2 - 90;

  let rows = "";
  languages.forEach((lang, i) => {
    const y = CARD_PAD + 34 + i * ROW_GAP;
    const w = Math.max(4, Math.round(barWidth * lang.pct));
    const delay = (0.2 + i * 0.15).toFixed(2);
    rows += `
    <text x="${CARD_PAD}" y="${y}" ${FONT} fill="#f2f2f5">${lang.language}</text>
    <rect x="${CARD_PAD}" y="${y + 6}" width="${barWidth}" height="${BAR_HEIGHT}" rx="4" fill="${TRACK}"/>
    <rect x="${CARD_PAD}" y="${y + 6}" width="0" height="${BAR_HEIGHT}" rx="4" fill="${ACCENT}">
      <animate attributeName="width" from="0" to="${w}" begin="${delay}s" dur="0.6s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.2 1"/>
    </rect>
    <text x="${WIDTH - CARD_PAD}" y="${y}" text-anchor="end" ${FONT} fill="#8b8b95">${Math.round(lang.pct * 100)}%</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
  <title>Prakhar Pandey — top languages by repository</title>
  <rect width="${WIDTH}" height="${height}" rx="14" fill="${BG}" stroke="${BORDER}"/>
  <text x="${CARD_PAD}" y="${CARD_PAD + 14}" font-family="ui-monospace,'JetBrains Mono',monospace" font-size="12" fill="#8b8b95">Top languages</text>
  ${rows}
</svg>
`;
}

async function main() {
  const repos = await fetchRepos();
  const languages = topLanguages(repos);
  const svg = renderSvg(languages);
  await writeFile(OUTPUT_PATH, svg, "utf-8");
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_PATH)} (${languages.length} languages from ${repos.length} repos)`);
}

main().catch((err) => {
  console.error("Language chart generation failed:", err);
  process.exit(1);
});
