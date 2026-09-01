#!/usr/bin/env node
/**
 * i18n 闸门：扫描 src/ 中残留的硬编码中文，并校验 en/zh 两份文案的 key 集合一致。
 *
 * 用法：
 *   node scripts/check-i18n.mjs              严格模式：有任何残留即非 0 退出
 *   node scripts/check-i18n.mjs --verbose    列出每条残留字符串及行号（Phase 3 抽取时用）
 *   node scripts/check-i18n.mjs --baseline   把当前每文件计数写入 .i18n-baseline.json
 *   node scripts/check-i18n.mjs --ratchet    只要计数不高于 baseline 即通过（每批次验收用）
 *
 * 豁免（不算残留）：
 *   - 注释、console.* 调用
 *   - src/messages、src/mock 目录
 *   - 数据契约中文键（后端 LLM 输出的 JSON 字段名，见 ALLOWED_TOKENS）
 *   - 行内 `i18n-ignore` 注释（本行或上一行）
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCAN_DIR = path.join(ROOT, 'src');
const EXCLUDE_DIRS = new Set(['messages', 'mock', 'node_modules', '.next']);
const BASELINE_FILE = path.join(ROOT, '.i18n-baseline.json');

/** 数据契约字段名：后端返回的 JSON key，翻译会破坏契约。见 en-plan.md Phase 0 白名单。 */
const ALLOWED_TOKENS = new Set(['角色', '内容', '出镜角色', '声音角色']);

const CJK = /[一-鿿㐀-䶿＀-￯　-〿]/;
const HAS_HAN = /[一-鿿㐀-䶿]/;

const args = new Set(process.argv.slice(2));
const VERBOSE = args.has('--verbose');
const WRITE_BASELINE = args.has('--baseline');
const RATCHET = args.has('--ratchet');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/**
 * 字符级扫描，区分：字符串字面量 / 代码区（JSX 文本与中文标识符）/ 注释。
 * 注释里的中文一律忽略，这是本脚本存在的意义——正则做不到这件事。
 */
function scanSource(src) {
  const hits = [];
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (pos) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= pos) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };

  let i = 0;
  let codeRun = '';      // 连续代码区文本（JSX 文本会落在这里）
  let codeRunStart = 0;

  const flushCodeRun = () => {
    if (HAS_HAN.test(codeRun)) {
      // 逐段抽出中文片段，过滤纯数据契约键
      const parts = codeRun.split(/[<>{}();,\n]/);
      for (const part of parts) {
        const text = part.trim();
        if (!text || !HAS_HAN.test(text)) continue;
        const bare = text.replace(/[\s?:'"`|]/g, '');
        if (ALLOWED_TOKENS.has(bare)) continue;
        hits.push({ line: lineOf(codeRunStart), kind: 'jsx/ident', text: text.slice(0, 80) });
      }
    }
    codeRun = '';
  };

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (c === '/' && next === '/') {                       // 行注释
      flushCodeRun();
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {                       // 块注释
      flushCodeRun();
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {             // 字符串字面量
      flushCodeRun();
      const quote = c;
      const start = i;
      let value = '';
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { value += src[i + 1] ?? ''; i += 2; continue; }
        if (src[i] === quote) { i++; break; }
        value += src[i]; i++;
      }
      if (CJK.test(value) && HAS_HAN.test(value)) {
        const bare = value.trim();
        if (!ALLOWED_TOKENS.has(bare)) {
          const ln = lineOf(start);
          hits.push({ line: ln, kind: 'string', text: value.replace(/\s+/g, ' ').slice(0, 80), pos: start });
        }
      }
      continue;
    }
    if (codeRun === '') codeRunStart = i;
    codeRun += c;
    i++;
  }
  flushCodeRun();
  return hits;
}

/**
 * 文件级豁免：文件顶部（前 30 行）出现 `i18n-ignore-file` 即整个文件跳过。
 * 只用于三类文件，加注释时必须写明属于哪一类：
 *   1. 数据契约——后端 LLM 输出的中文 JSON 字段名，翻译会破坏契约
 *   2. 诊断字符串——只进日志/调试，不渲染给用户
 *   3. mock / fixture 数据
 */
function isFileExempt(src) {
  return /i18n-ignore-file/.test(src.split('\n').slice(0, 30).join('\n'));
}

/** console.* 与 i18n-ignore 豁免：按行文本判断，覆盖绝大多数单行写法。 */
function filterExempt(hits, src) {
  if (isFileExempt(src)) return [];
  const lines = src.split('\n');
  return hits.filter((h) => {
    const cur = lines[h.line - 1] ?? '';
    const prev = lines[h.line - 2] ?? '';
    if (/i18n-ignore/.test(cur) || /i18n-ignore/.test(prev)) return false;
    if (h.kind === 'string' && /console\.(log|warn|error|info|debug)\s*\(/.test(cur)) return false;
    return true;
  });
}

// ---- 1) 扫描残留中文 -------------------------------------------------------
const files = walk(SCAN_DIR).sort();
const report = [];
let total = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!HAS_HAN.test(src)) continue;
  const hits = filterExempt(scanSource(src), src);
  if (!hits.length) continue;
  const rel = path.relative(ROOT, file);
  report.push({ file: rel, count: hits.length, hits });
  total += hits.length;
}

report.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));

// ---- 2) 校验 en/zh key 集合一致 --------------------------------------------
function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );
}
const en = JSON.parse(fs.readFileSync(path.join(SCAN_DIR, 'messages/en.json'), 'utf8'));
const zh = JSON.parse(fs.readFileSync(path.join(SCAN_DIR, 'messages/zh.json'), 'utf8'));
const enKeys = new Set(flatten(en));
const zhKeys = new Set(flatten(zh));
const onlyEn = [...enKeys].filter((k) => !zhKeys.has(k));
const onlyZh = [...zhKeys].filter((k) => !enKeys.has(k));
const cjkInEn = flatten(en).filter((k) => {
  const v = k.split('.').reduce((o, part) => o?.[part], en);
  return typeof v === 'string' && HAS_HAN.test(v) && k !== 'language.zh';
});

// ---- 3) 输出 ---------------------------------------------------------------
console.log('\n=== 残留硬编码中文 ===');
if (!report.length) {
  console.log('  无 ✅');
} else {
  for (const r of report) console.log(`  ${String(r.count).padStart(4)}  ${r.file}`);
  console.log(`  ${'—'.repeat(40)}`);
  console.log(`  ${String(total).padStart(4)}  合计（${report.length} 个文件）`);
}

if (VERBOSE) {
  console.log('\n=== 明细 ===');
  for (const r of report) {
    console.log(`\n${r.file}`);
    for (const h of r.hits) console.log(`  ${String(h.line).padStart(5)}  [${h.kind}] ${h.text}`);
  }
}

console.log('\n=== 文案 key 一致性 ===');
console.log(`  en: ${enKeys.size} keys   zh: ${zhKeys.size} keys`);
if (onlyEn.length) console.log(`  仅 en 有 (${onlyEn.length}): ${onlyEn.join(', ')}`);
if (onlyZh.length) console.log(`  仅 zh 有 (${onlyZh.length}): ${onlyZh.join(', ')}`);
if (!onlyEn.length && !onlyZh.length) console.log('  key 集合一致 ✅');
if (cjkInEn.length) console.log(`  ⚠️  en.json 中仍含中文的 key (${cjkInEn.length}): ${cjkInEn.join(', ')}`);

// ---- 4) 退出码 -------------------------------------------------------------
const counts = Object.fromEntries(report.map((r) => [r.file, r.count]));

if (WRITE_BASELINE) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({ total, counts }, null, 2) + '\n');
  console.log(`\n已写入 baseline：${path.relative(ROOT, BASELINE_FILE)}（total ${total}）`);
  process.exit(0);
}

const keysMisaligned = onlyEn.length > 0 || onlyZh.length > 0;

if (RATCHET) {
  if (!fs.existsSync(BASELINE_FILE)) {
    console.error('\n❌ 缺少 .i18n-baseline.json，先跑 --baseline');
    process.exit(1);
  }
  const base = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  const regressions = [];
  for (const [file, count] of Object.entries(counts)) {
    const before = base.counts[file] ?? 0;
    if (count > before) regressions.push(`${file}: ${before} → ${count}`);
  }
  console.log(`\nbaseline total ${base.total} → 当前 ${total}（减少 ${base.total - total}）`);
  if (regressions.length) {
    console.error('\n❌ 以下文件的硬编码中文增加了：');
    regressions.forEach((r) => console.error(`   ${r}`));
    process.exit(1);
  }
  if (keysMisaligned) { console.error('\n❌ en/zh key 集合不一致'); process.exit(1); }
  console.log('✅ ratchet 通过');
  process.exit(0);
}

if (total > 0 || keysMisaligned) {
  console.error(`\n❌ 未通过：${total} 条残留中文${keysMisaligned ? '，且 en/zh key 集合不一致' : ''}`);
  process.exit(1);
}
console.log('\n✅ 通过');
