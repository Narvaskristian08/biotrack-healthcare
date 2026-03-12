import fs from 'node:fs';
import path from 'node:path';

function readArg(flag, fallback = '') {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, max = 180) {
  const text = String(value ?? '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}...`;
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function parseSeverity(riskdesc) {
  const raw = String(riskdesc ?? '').trim().toLowerCase();
  if (raw.startsWith('high')) return 'high';
  if (raw.startsWith('medium')) return 'medium';
  if (raw.startsWith('low')) return 'low';
  return 'info';
}

function severityLabel(key) {
  return {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    info: 'Info',
  }[key] ?? 'Info';
}

function severityRank(key) {
  return {
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  }[key] ?? 0;
}

function confidenceLabel(value) {
  return {
    '0': 'False Positive',
    '1': 'Low',
    '2': 'Medium',
    '3': 'High',
    '4': 'Confirmed',
  }[String(value ?? '').trim()] ?? String(value ?? 'Unknown');
}

function toCount(value, fallback = 0) {
  const count = Number(value);
  return Number.isFinite(count) ? count : fallback;
}

function formatPath(rawUrl) {
  try {
    const url = new URL(String(rawUrl));
    const pathName = `${url.pathname || '/'}${url.search || ''}`;
    return pathName || '/';
  } catch {
    return String(rawUrl ?? '');
  }
}

function intensityMeta(score) {
  if (score >= 80) return { label: 'Critical', tone: 'critical' };
  if (score >= 60) return { label: 'High', tone: 'high' };
  if (score >= 35) return { label: 'Elevated', tone: 'elevated' };
  if (score >= 15) return { label: 'Guarded', tone: 'guarded' };
  return { label: 'Minimal', tone: 'minimal' };
}

function computeIntensity(counts, instanceTotal) {
  const weightedRules =
    counts.high * 30 +
    counts.medium * 18 +
    counts.low * 8 +
    counts.info * 3;
  const weightedInstances = Math.min(32, Math.round(Math.log1p(instanceTotal) * 8));
  return Math.min(100, weightedRules + weightedInstances);
}

function buildTargetSummary({
  id,
  label,
  publicTarget,
  reportDirAbs,
  stamp,
  statusCode,
  baseName,
}) {
  const latestHtmlRel = `${baseName}-latest.html`;
  const latestJsonRel = `${baseName}-latest.json`;
  const latestMdRel = `${baseName}-latest.md`;
  const runHtmlRel = `${stamp}/${baseName}.html`;
  const runJsonRel = `${stamp}/${baseName}.json`;
  const runMdRel = `${stamp}/${baseName}.md`;

  const latestHtmlAbs = path.join(reportDirAbs, latestHtmlRel);
  const latestJsonAbs = path.join(reportDirAbs, latestJsonRel);
  const latestMdAbs = path.join(reportDirAbs, latestMdRel);
  const runHtmlAbs = path.join(reportDirAbs, runHtmlRel);
  const runJsonAbs = path.join(reportDirAbs, runJsonRel);
  const runMdAbs = path.join(reportDirAbs, runMdRel);

  const dataPath = fileExists(latestJsonAbs) ? latestJsonAbs : fileExists(runJsonAbs) ? runJsonAbs : '';
  const data = dataPath ? readJson(dataPath) : null;
  const alerts = (data?.site ?? []).flatMap((site) => site?.alerts ?? []);
  const hostTarget = String(data?.site?.[0]?.['@name'] ?? '').trim();
  const effectiveTarget = hostTarget || publicTarget;

  const ruleCounts = { high: 0, medium: 0, low: 0, info: 0 };
  const instanceCounts = { high: 0, medium: 0, low: 0, info: 0 };
  const uniqueUris = new Set();

  for (const alert of alerts) {
    const severity = parseSeverity(alert?.riskdesc);
    const count = toCount(alert?.count, Array.isArray(alert?.instances) ? alert.instances.length : 0);
    ruleCounts[severity] += 1;
    instanceCounts[severity] += count;
    for (const instance of alert?.instances ?? []) {
      if (instance?.uri) uniqueUris.add(String(instance.uri));
    }
  }

  const instanceTotal = Object.values(instanceCounts).reduce((sum, value) => sum + value, 0);
  const intensityScore = computeIntensity(ruleCounts, instanceTotal);
  const intensity = intensityMeta(intensityScore);

  const topFindings = alerts
    .map((alert) => {
      const severity = parseSeverity(alert?.riskdesc);
      const samplePaths = (alert?.instances ?? [])
        .slice(0, 3)
        .map((instance) => formatPath(instance?.uri))
        .filter(Boolean);
      return {
        name: String(alert?.name ?? 'Unnamed finding'),
        severity,
        severityLabel: severityLabel(severity),
        count: toCount(alert?.count, Array.isArray(alert?.instances) ? alert.instances.length : 0),
        confidence: confidenceLabel(alert?.confidence),
        summary: truncate(stripHtml(alert?.desc || alert?.solution || '')),
        samplePaths,
      };
    })
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6);

  const insights = (data?.insights ?? [])
    .filter((entry) => String(entry?.level ?? '').toLowerCase() === 'info')
    .map((entry) => ({
      label: String(entry?.description ?? '').trim(),
      value: String(entry?.statistic ?? '').trim(),
    }))
    .filter((entry) => entry.label && entry.value)
    .slice(0, 3);

  return {
    id,
    label,
    publicTarget,
    effectiveTarget,
    statusCode,
    statusLabel:
      {
        0: 'pass',
        1: 'fail',
        2: 'warn',
        3: 'error',
      }[statusCode] ?? `exit-${statusCode}`,
    statusSummary:
      {
        0: 'Completed without new alerts.',
        1: 'Completed with at least one failure-level result.',
        2: 'Completed with warnings. Review the highlighted rules.',
        3: 'Scan did not complete cleanly. Review the raw report.',
      }[statusCode] ?? `Exited with code ${statusCode}. Review the raw report.`,
    latestHtmlRel,
    latestJsonRel,
    latestMdRel,
    runHtmlRel,
    runJsonRel,
    runMdRel,
    hasLatestHtml: fileExists(latestHtmlAbs),
    hasLatestJson: fileExists(latestJsonAbs),
    hasLatestMd: fileExists(latestMdAbs),
    hasRunHtml: fileExists(runHtmlAbs),
    hasRunJson: fileExists(runJsonAbs),
    hasRunMd: fileExists(runMdAbs),
    hasReport: Boolean(fileExists(runHtmlAbs) || fileExists(runJsonAbs) || fileExists(runMdAbs)),
    alertRuleTotal: alerts.length,
    urlTotal: uniqueUris.size,
    instanceTotal,
    ruleCounts,
    instanceCounts,
    intensityScore,
    intensity,
    topFindings,
    insights,
  };
}

function renderLinks(summary) {
  const items = [];
  if (summary.hasLatestHtml) items.push(`<a href="./${summary.latestHtmlRel}">Latest HTML</a>`);
  if (summary.hasRunHtml) items.push(`<a href="./${summary.runHtmlRel}">Timestamped HTML</a>`);
  if (summary.hasLatestJson) items.push(`<a href="./${summary.latestJsonRel}">Latest JSON</a>`);
  if (summary.hasLatestMd) items.push(`<a href="./${summary.latestMdRel}">Latest Markdown</a>`);
  if (!items.length) {
    return '<p class="muted">No report artifacts were generated for this target.</p>';
  }
  return `<div class="links">${items.join('')}</div>`;
}

function renderSeverityPills(summary) {
  return ['high', 'medium', 'low', 'info']
    .map((severity) => {
      const rules = summary.ruleCounts[severity];
      const instances = summary.instanceCounts[severity];
      return `
        <div class="severity-pill severity-pill--${severity}">
          <span>${severityLabel(severity)}</span>
          <strong>${rules}</strong>
          <small>${instances} hits</small>
        </div>
      `;
    })
    .join('');
}

function renderFindingCard(finding) {
  const samplePaths = finding.samplePaths.length
    ? `<div class="finding-paths">${finding.samplePaths
        .map((item) => `<code>${escapeHtml(item)}</code>`)
        .join('')}</div>`
    : '';

  return `
    <article class="finding finding--${finding.severity}">
      <div class="finding-meta">
        <span class="finding-severity finding-severity--${finding.severity}">${finding.severityLabel}</span>
        <span>${finding.count} hit${finding.count === 1 ? '' : 's'}</span>
        <span>Confidence: ${escapeHtml(finding.confidence)}</span>
      </div>
      <h4>${escapeHtml(finding.name)}</h4>
      <p>${escapeHtml(finding.summary || 'No summary available.')}</p>
      ${samplePaths}
    </article>
  `;
}

function renderInsights(summary) {
  if (!summary.insights.length) {
    return '<p class="muted">No lightweight telemetry insights were available for this scan.</p>';
  }
  return `
    <div class="insight-grid">
      ${summary.insights
        .map(
          (insight) => `
            <div class="insight-card">
              <span>${escapeHtml(insight.label)}</span>
              <strong>${escapeHtml(insight.value)}</strong>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function renderTargetSection(summary) {
  const findingsMarkup = summary.topFindings.length
    ? summary.topFindings.map(renderFindingCard).join('')
    : '<p class="muted">No findings were captured in the JSON report.</p>';

  return `
    <section class="scan-card">
      <div class="scan-head">
        <div>
          <p class="eyebrow">${escapeHtml(summary.label)}</p>
          <h2>${escapeHtml(summary.publicTarget)}</h2>
          <p class="muted">Scanned target inside Docker: <code>${escapeHtml(summary.effectiveTarget)}</code></p>
        </div>
        <span class="status status--${escapeHtml(summary.statusLabel)}">${escapeHtml(summary.statusLabel)}</span>
      </div>

      <div class="scan-overview">
        <div class="intensity-ring intensity-ring--${escapeHtml(summary.intensity.tone)}" style="--score:${summary.intensityScore}">
          <div class="intensity-ring__inner">
            <strong>${summary.intensityScore}</strong>
            <span>${escapeHtml(summary.intensity.label)}</span>
          </div>
        </div>
        <div class="scan-stats">
          <div class="stat-card">
            <span>Alert Rules</span>
            <strong>${summary.alertRuleTotal}</strong>
          </div>
          <div class="stat-card">
            <span>Affected URLs</span>
            <strong>${summary.urlTotal}</strong>
          </div>
          <div class="stat-card">
            <span>Total Hits</span>
            <strong>${summary.instanceTotal}</strong>
          </div>
          <div class="stat-card">
            <span>Intensity</span>
            <strong>${escapeHtml(summary.intensity.label)}</strong>
          </div>
        </div>
      </div>

      <p class="scan-summary">${escapeHtml(summary.statusSummary)}</p>

      <div class="severity-grid">
        ${renderSeverityPills(summary)}
      </div>

      <div class="section-grid">
        <div class="section-card">
          <div class="section-head">
            <h3>Top Findings</h3>
            <p>Highest-severity rules first, then by hit count.</p>
          </div>
          <div class="finding-list">
            ${findingsMarkup}
          </div>
        </div>

        <div class="section-card">
          <div class="section-head">
            <h3>Scan Signals</h3>
            <p>Quick metrics extracted from ZAP insights.</p>
          </div>
          ${renderInsights(summary)}
          <div class="resource-block">
            <h3>Raw Reports</h3>
            ${renderLinks(summary)}
          </div>
        </div>
      </div>
    </section>
  `;
}

const reportDirRel = readArg('--report-dir', 'docs/zap');
const stamp = readArg('--stamp', '');
const generatedAt = readArg('--generated-at', new Date().toISOString());
const webTarget = readArg('--web-target', 'http://127.0.0.1:3001');
const apiTarget = readArg('--api-target', 'http://127.0.0.1:3000/api');
const webStatus = Number(readArg('--web-status', '0'));
const apiStatus = Number(readArg('--api-status', '0'));

const cwd = process.cwd();
const reportDirAbs = path.resolve(cwd, reportDirRel);
const indexPath = path.join(reportDirAbs, 'index.html');

const webSummary = buildTargetSummary({
  id: 'web',
  label: 'Web Experience',
  publicTarget: webTarget,
  reportDirAbs,
  stamp,
  statusCode: webStatus,
  baseName: 'zap-web-baseline',
});

const apiSummary = buildTargetSummary({
  id: 'api',
  label: 'API Surface',
  publicTarget: apiTarget,
  reportDirAbs,
  stamp,
  statusCode: apiStatus,
  baseName: 'zap-api-baseline',
});

const totals = [webSummary, apiSummary].reduce(
  (acc, summary) => {
    acc.rules += summary.alertRuleTotal;
    acc.urls += summary.urlTotal;
    acc.hits += summary.instanceTotal;
    acc.high += summary.ruleCounts.high;
    acc.medium += summary.ruleCounts.medium;
    acc.low += summary.ruleCounts.low;
    acc.info += summary.ruleCounts.info;
    return acc;
  },
  { rules: 0, urls: 0, hits: 0, high: 0, medium: 0, low: 0, info: 0 }
);

const overallIntensityScore = Math.max(webSummary.intensityScore, apiSummary.intensityScore);
const overallIntensity = intensityMeta(overallIntensityScore);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BioTrack ZAP Security Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f1e8;
      --surface: rgba(255, 255, 255, 0.9);
      --surface-strong: #ffffff;
      --text: #1d2522;
      --muted: #5b6862;
      --line: rgba(39, 53, 48, 0.12);
      --shadow: 0 28px 70px rgba(26, 37, 33, 0.11);
      --green: #1f8f5f;
      --amber: #d08a22;
      --orange: #d96b2b;
      --red: #c84242;
      --blue: #2f6fb4;
      --ink-soft: #2b3833;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      font-family: "Segoe UI", Arial, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(31, 143, 95, 0.14), transparent 28%),
        radial-gradient(circle at top right, rgba(208, 138, 34, 0.12), transparent 26%),
        linear-gradient(180deg, #f8f5ee 0%, var(--bg) 100%);
    }
    main {
      max-width: 1240px;
      margin: 0 auto;
      padding: 36px 20px 64px;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      gap: 22px;
      align-items: stretch;
      margin-bottom: 24px;
    }
    .panel {
      background: var(--surface);
      backdrop-filter: blur(12px);
      border: 1px solid var(--line);
      border-radius: 28px;
      box-shadow: var(--shadow);
    }
    .hero-copy {
      padding: 28px;
      position: relative;
      overflow: hidden;
    }
    .hero-copy::after {
      content: "";
      position: absolute;
      right: -80px;
      top: -80px;
      width: 240px;
      height: 240px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(31, 143, 95, 0.18), transparent 65%);
      pointer-events: none;
    }
    .eyebrow {
      margin: 0 0 10px;
      color: var(--green);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.76rem;
      font-weight: 700;
    }
    h1, h2, h3, h4, p { margin: 0; }
    h1 {
      font-size: clamp(2rem, 4vw, 3.4rem);
      line-height: 0.98;
      letter-spacing: -0.04em;
      max-width: 11ch;
    }
    .hero-copy p {
      margin-top: 14px;
      color: var(--muted);
      line-height: 1.65;
      max-width: 58ch;
    }
    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }
    .meta-chip {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(39, 53, 48, 0.06);
      color: var(--ink-soft);
      font-size: 0.9rem;
      border: 1px solid rgba(39, 53, 48, 0.08);
    }
    .hero-summary {
      padding: 24px;
      display: grid;
      gap: 16px;
      align-content: start;
    }
    .overall-intensity {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 18px;
      border-radius: 22px;
      background: linear-gradient(135deg, rgba(255,255,255,0.94), rgba(250,247,240,0.92));
      border: 1px solid rgba(39, 53, 48, 0.08);
    }
    .intensity-ring {
      --ring-color: var(--green);
      width: 118px;
      height: 118px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: conic-gradient(var(--ring-color) calc(var(--score) * 1%), rgba(39, 53, 48, 0.1) 0);
      flex: 0 0 auto;
    }
    .intensity-ring--minimal { --ring-color: var(--green); }
    .intensity-ring--guarded { --ring-color: var(--amber); }
    .intensity-ring--elevated { --ring-color: var(--orange); }
    .intensity-ring--high,
    .intensity-ring--critical { --ring-color: var(--red); }
    .intensity-ring__inner {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: var(--surface-strong);
      display: grid;
      place-items: center;
      text-align: center;
      box-shadow: inset 0 0 0 1px rgba(39, 53, 48, 0.06);
    }
    .intensity-ring__inner strong {
      display: block;
      font-size: 1.7rem;
      line-height: 1;
      letter-spacing: -0.05em;
    }
    .intensity-ring__inner span {
      font-size: 0.74rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
      margin-top: 4px;
    }
    .overall-copy h2 {
      font-size: 1.35rem;
      letter-spacing: -0.03em;
    }
    .overall-copy p {
      margin-top: 8px;
      color: var(--muted);
      line-height: 1.55;
    }
    .totals-grid,
    .scan-stats,
    .severity-grid,
    .section-grid,
    .dashboard-grid,
    .insight-grid {
      display: grid;
      gap: 14px;
    }
    .totals-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .metric-card,
    .stat-card,
    .insight-card {
      border: 1px solid rgba(39, 53, 48, 0.08);
      background: rgba(255, 255, 255, 0.82);
      border-radius: 18px;
      padding: 16px;
    }
    .metric-card span,
    .stat-card span,
    .insight-card span {
      display: block;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .metric-card strong,
    .stat-card strong,
    .insight-card strong {
      font-size: 1.4rem;
      letter-spacing: -0.04em;
    }
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
    .scan-card {
      padding: 24px;
      border-radius: 26px;
      border: 1px solid var(--line);
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .scan-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }
    .scan-head h2 {
      font-size: 1.5rem;
      letter-spacing: -0.03em;
      margin-bottom: 6px;
    }
    .muted {
      color: var(--muted);
      line-height: 1.55;
    }
    .status {
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-weight: 700;
      border: 1px solid transparent;
      flex: 0 0 auto;
    }
    .status--pass {
      color: var(--green);
      background: rgba(31, 143, 95, 0.12);
      border-color: rgba(31, 143, 95, 0.18);
    }
    .status--warn {
      color: var(--amber);
      background: rgba(208, 138, 34, 0.14);
      border-color: rgba(208, 138, 34, 0.18);
    }
    .status--fail,
    .status--error {
      color: var(--red);
      background: rgba(200, 66, 66, 0.12);
      border-color: rgba(200, 66, 66, 0.18);
    }
    .scan-overview {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 20px;
      align-items: center;
      margin-bottom: 16px;
    }
    .scan-stats {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .scan-summary {
      margin-bottom: 14px;
      color: var(--ink-soft);
      line-height: 1.6;
    }
    .severity-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-bottom: 18px;
    }
    .severity-pill {
      display: grid;
      gap: 4px;
      padding: 14px;
      border-radius: 18px;
      border: 1px solid rgba(39, 53, 48, 0.08);
      background: rgba(255,255,255,0.82);
    }
    .severity-pill span {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }
    .severity-pill strong {
      font-size: 1.5rem;
      letter-spacing: -0.04em;
    }
    .severity-pill small {
      color: var(--muted);
      font-size: 0.85rem;
    }
    .severity-pill--high strong { color: var(--red); }
    .severity-pill--medium strong { color: var(--orange); }
    .severity-pill--low strong { color: var(--amber); }
    .severity-pill--info strong { color: var(--blue); }
    .section-grid {
      grid-template-columns: 1.35fr 1fr;
      align-items: start;
    }
    .section-card {
      background: rgba(255,255,255,0.76);
      border: 1px solid rgba(39, 53, 48, 0.08);
      border-radius: 22px;
      padding: 18px;
    }
    .section-head {
      margin-bottom: 14px;
    }
    .section-head h3,
    .resource-block h3 {
      font-size: 1rem;
      letter-spacing: -0.03em;
      margin-bottom: 4px;
    }
    .section-head p {
      color: var(--muted);
      line-height: 1.5;
    }
    .finding-list {
      display: grid;
      gap: 12px;
    }
    .finding {
      border-radius: 18px;
      padding: 14px;
      border: 1px solid rgba(39, 53, 48, 0.08);
      background: rgba(255,255,255,0.9);
    }
    .finding-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
      font-size: 0.82rem;
      color: var(--muted);
    }
    .finding-severity {
      border-radius: 999px;
      padding: 5px 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
    }
    .finding-severity--high { color: var(--red); background: rgba(200, 66, 66, 0.12); }
    .finding-severity--medium { color: var(--orange); background: rgba(217, 107, 43, 0.13); }
    .finding-severity--low { color: var(--amber); background: rgba(208, 138, 34, 0.13); }
    .finding-severity--info { color: var(--blue); background: rgba(47, 111, 180, 0.12); }
    .finding h4 {
      font-size: 1rem;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .finding p {
      color: var(--ink-soft);
      line-height: 1.55;
    }
    .finding-paths {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .finding-paths code,
    code {
      display: inline-block;
      font-family: "SFMono-Regular", Consolas, monospace;
      background: rgba(39, 53, 48, 0.07);
      padding: 4px 8px;
      border-radius: 10px;
      font-size: 0.84rem;
      color: var(--ink-soft);
      overflow-wrap: anywhere;
    }
    .insight-grid {
      grid-template-columns: 1fr;
      margin-bottom: 16px;
    }
    .resource-block {
      padding-top: 4px;
      border-top: 1px solid rgba(39, 53, 48, 0.08);
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 12px;
      border-radius: 999px;
      background: rgba(31, 143, 95, 0.1);
      color: var(--green);
      text-decoration: none;
      font-weight: 700;
      font-size: 0.92rem;
      border: 1px solid rgba(31, 143, 95, 0.16);
    }
    a:hover {
      background: rgba(31, 143, 95, 0.16);
    }
    @media (max-width: 980px) {
      .hero,
      .section-grid,
      .scan-overview {
        grid-template-columns: 1fr;
      }
      .totals-grid,
      .scan-stats,
      .severity-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 640px) {
      main { padding-inline: 14px; }
      .hero-copy,
      .hero-summary,
      .scan-card { padding: 18px; }
      .totals-grid,
      .scan-stats,
      .severity-grid {
        grid-template-columns: 1fr;
      }
      .overall-intensity {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="panel hero-copy">
        <p class="eyebrow">BioTrack Security Dashboard</p>
        <h1>ZAP baseline results with visual intensity.</h1>
        <p>This page summarizes the latest unauthenticated scans for the web experience and API surface. Severity counts, hit volume, and top findings are pulled from the latest ZAP JSON outputs so the dashboard stays aligned with the raw reports.</p>
        <div class="hero-meta">
          <span class="meta-chip">Generated ${escapeHtml(generatedAt)}</span>
          <span class="meta-chip">Run ID ${escapeHtml(stamp)}</span>
          <span class="meta-chip">Overall intensity ${escapeHtml(overallIntensity.label)}</span>
        </div>
      </div>

      <div class="panel hero-summary">
        <div class="overall-intensity">
          <div class="intensity-ring intensity-ring--${escapeHtml(overallIntensity.tone)}" style="--score:${overallIntensityScore}">
            <div class="intensity-ring__inner">
              <strong>${overallIntensityScore}</strong>
              <span>${escapeHtml(overallIntensity.label)}</span>
            </div>
          </div>
          <div class="overall-copy">
            <h2>Current exposure profile</h2>
            <p>The highest scan intensity across the current reports is <strong>${escapeHtml(overallIntensity.label)}</strong>. This score reflects rule severity plus the breadth of affected responses, not exploitability on its own.</p>
          </div>
        </div>

        <div class="totals-grid">
          <div class="metric-card">
            <span>Total Alert Rules</span>
            <strong>${totals.rules}</strong>
          </div>
          <div class="metric-card">
            <span>Total URLs Affected</span>
            <strong>${totals.urls}</strong>
          </div>
          <div class="metric-card">
            <span>Total Alert Hits</span>
            <strong>${totals.hits}</strong>
          </div>
          <div class="metric-card">
            <span>High Rules</span>
            <strong>${totals.high}</strong>
          </div>
          <div class="metric-card">
            <span>Medium Rules</span>
            <strong>${totals.medium}</strong>
          </div>
          <div class="metric-card">
            <span>Low and Info Rules</span>
            <strong>${totals.low + totals.info}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="dashboard-grid">
      ${renderTargetSection(webSummary)}
      ${renderTargetSection(apiSummary)}
    </section>
  </main>
</body>
</html>`;

fs.writeFileSync(indexPath, html);
console.log(`ZAP dashboard written to ${path.relative(cwd, indexPath)}`);
