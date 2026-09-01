#!/usr/bin/env node
/**
 * 类型闸门
 *
 * 为什么需要它：next.config.js 里有 typescript.ignoreBuildErrors: true，
 * 所以 `pnpm build` 会直接略过类型错误，甚至略过语法错误——只有被打包
 * 引用到的文件才会因语法问题炸掉。Phase 3a~3d 就是因为只跑 build，
 * 把 43 个语法错误提交了进去。
 *
 * 规则：
 *   1. 语法错误（TS1xxx，四位）零容忍——一条都不许有
 *   2. 语义错误总数不得超过基线（.ts-baseline.json）
 *
 * 用法：
 *   node scripts/check-types.mjs            严格模式（超基线即 exit 1）
 *   node scripts/check-types.mjs --baseline 把当前数量写入基线
 *   node scripts/check-types.mjs --verbose  列出相对基线新增/消失的错误
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, '.ts-baseline.json');

const args = process.argv.slice(2);
const WRITE_BASELINE = args.includes('--baseline');
const VERBOSE = args.includes('--verbose');

function runTsc() {
  try {
    execSync('npx tsc --noEmit', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    return '';
  } catch (e) {
    // tsc 有错误时以非 0 退出，输出在 stdout
    return (e.stdout || '') + (e.stderr || '');
  }
}

const raw = runTsc();
const lines = raw.split('\n').filter((l) => /error TS\d+:/.test(l));

// 归一化：去掉行列号，只留 文件 + 错误码 + 消息首句，便于跨次比对
function normalize(line) {
  return line
    .replace(/\((\d+),(\d+)\)/, '')
    .replace(/^.*?(src\/|tests\/)/, '$1')
    .trim();
}

// 四位 TS1xxx 才是语法错误；TS18047 这种五位是语义错误，别误判
const syntaxErrors = lines.filter((l) => /error TS1\d{3}:/.test(l));
const normalized = lines.map(normalize).sort();

const byFile = new Map();
for (const l of lines) {
  const m = l.match(/^(.*?)\((\d+),\d+\)/);
  const f = m ? m[1].replace(/^.*?(src\/|tests\/)/, '$1') : '<unknown>';
  byFile.set(f, (byFile.get(f) || 0) + 1);
}

console.log('');
console.log('=== 类型检查 ===');
console.log(`  错误总数: ${lines.length}`);
console.log(`  语法错误(TS1xxx): ${syntaxErrors.length}`);

if (syntaxErrors.length) {
  console.log('');
  console.log('  ❌ 语法错误明细（零容忍）:');
  for (const l of syntaxErrors.slice(0, 30)) console.log('    ' + normalize(l));
  if (syntaxErrors.length > 30) console.log(`    …还有 ${syntaxErrors.length - 30} 条`);
}

if (WRITE_BASELINE) {
  if (syntaxErrors.length) {
    console.log('');
    console.log('❌ 存在语法错误，拒绝写入基线——先修好再说');
    process.exit(1);
  }
  fs.writeFileSync(
    BASELINE,
    JSON.stringify({ total: lines.length, errors: normalized }, null, 2) + '\n',
    'utf8'
  );
  console.log('');
  console.log(`已写入基线：.ts-baseline.json（total ${lines.length}）`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.log('');
  console.log('⚠️  没有 .ts-baseline.json，先跑 `pnpm check:types:baseline`');
  process.exit(syntaxErrors.length ? 1 : 0);
}

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

// 逐条 diff（多重集合，同一条重复出现也能对上）
const baseCount = new Map();
for (const e of base.errors) baseCount.set(e, (baseCount.get(e) || 0) + 1);
const curCount = new Map();
for (const e of normalized) curCount.set(e, (curCount.get(e) || 0) + 1);

const added = [];
for (const [e, n] of curCount) {
  const d = n - (baseCount.get(e) || 0);
  for (let i = 0; i < d; i++) added.push(e);
}
const gone = [];
for (const [e, n] of baseCount) {
  const d = n - (curCount.get(e) || 0);
  for (let i = 0; i < d; i++) gone.push(e);
}

console.log('');
console.log(`  基线 ${base.total} → 当前 ${lines.length}`);
console.log(`  新增 ${added.length} 条，消失 ${gone.length} 条`);

if (VERBOSE || added.length) {
  if (added.length) {
    console.log('');
    console.log('  新增错误:');
    for (const e of added.slice(0, 40)) console.log('    + ' + e);
    if (added.length > 40) console.log(`    …还有 ${added.length - 40} 条`);
  }
  if (VERBOSE && gone.length) {
    console.log('');
    console.log('  已修复:');
    for (const e of gone.slice(0, 40)) console.log('    - ' + e);
  }
}

if (VERBOSE && !added.length) {
  const top = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log('');
  console.log('  错误分布 Top 15:');
  for (const [f, n] of top) console.log(`    ${String(n).padStart(4)}  ${f}`);
}

console.log('');
if (syntaxErrors.length) {
  console.log('❌ 未通过：存在语法错误');
  process.exit(1);
}
if (added.length) {
  console.log(`❌ 未通过：相对基线新增 ${added.length} 条类型错误`);
  process.exit(1);
}
console.log('✅ 类型闸门通过（无语法错误，无新增类型错误）');
if (gone.length) {
  console.log(`   顺带修掉了 ${gone.length} 条既有错误——可跑 --baseline 收紧基线`);
}
process.exit(0);
