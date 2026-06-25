// Generates src/data/crossReferences.js by merging:
// 1. Thematic refs derived from themes.js + emotions.js clusters
// 2. Hand-curated theological cross-refs (from the existing file)
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// ── Parse verse clusters from a source file ───────────────
function parseClusters(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const clusters = [];
  // Extract each { verses: [...] } block
  const blockRe = /verses:\s*\[([^\]]+)\]/g;
  let bm;
  while ((bm = blockRe.exec(src)) !== null) {
    const block = bm[1];
    const refs = [];
    const refRe = /ref:\s*['"]([^'"]+)['"]/g;
    let rm;
    while ((rm = refRe.exec(block)) !== null) refs.push(rm[1]);
    if (refs.length > 1) clusters.push(refs);
  }
  return clusters;
}

// ── Build verse→refs map from clusters ────────────────────
function clustersToCrossRefs(clusters) {
  const map = {};
  for (const cluster of clusters) {
    for (let i = 0; i < cluster.length; i++) {
      const from = cluster[i];
      if (!map[from]) map[from] = new Set();
      for (let j = 0; j < cluster.length; j++) {
        if (j !== i) map[from].add(cluster[j]);
      }
    }
  }
  return map;
}

// ── Load existing hand-curated refs ──────────────────────
function parseExisting(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const map = {};
  // Match "Key": ["v1", "v2", ...]
  const entryRe = /"([^"]+)":\s*\[([^\]]*)\]/g;
  let em;
  while ((em = entryRe.exec(src)) !== null) {
    const key = em[1];
    const vals = [];
    const valRe = /"([^"]+)"/g;
    let vm;
    while ((vm = valRe.exec(em[2])) !== null) vals.push(vm[1]);
    if (vals.length) map[key] = vals;
  }
  return map;
}

// ── Merge maps (hand-curated wins for overlap) ────────────
function merge(themed, curated) {
  const result = {};
  for (const [k, vSet] of Object.entries(themed)) {
    result[k] = [...vSet].slice(0, 8);
  }
  for (const [k, vals] of Object.entries(curated)) {
    if (!result[k]) {
      result[k] = vals;
    } else {
      // Merge, keeping curated first, deduplicated, max 8
      const seen = new Set(vals);
      const extra = result[k].filter((v) => !seen.has(v));
      result[k] = [...vals, ...extra].slice(0, 8);
    }
  }
  return result;
}

// ── Main ──────────────────────────────────────────────────
const themeClusters   = parseClusters(path.join(root, 'src/data/themes.js'));
const emotionClusters = parseClusters(path.join(root, 'src/data/emotions.js'));
const allClusters     = [...themeClusters, ...emotionClusters];

const themed  = clustersToCrossRefs(allClusters);
const curated = parseExisting(path.join(root, 'src/data/crossReferences.js'));
const merged  = merge(themed, curated);

const entries = Object.entries(merged)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, vals]) => {
    const list = vals.map((v) => `"${v}"`).join(', ');
    return `  "${k}": [${list}]`;
  })
  .join(',\n');

const output = `// Cross-reference map: "Book Chapter:Verse" → array of related references
// Auto-generated from themes.js + emotions.js clusters, merged with curated theological refs.
// Run scripts/generateCrossRefs.mjs to regenerate.
export const CROSS_REFS = {
${entries}
};

export function getCrossRefs(bookName, chapter, verse) {
  const key = \`\${bookName} \${chapter}:\${verse}\`;
  return CROSS_REFS[key] || [];
}
`;

writeFileSync(path.join(root, 'src/data/crossReferences.js'), output);
console.log(`Written ${Object.keys(merged).length} verse entries to crossReferences.js`);
