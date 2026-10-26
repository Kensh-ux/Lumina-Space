#!/usr/bin/env node
// 校验「暂存区 == 仓库」。暂存区必须是仓库的镜像，最终推上去的就是暂存区内容。
// 用法: node check_mirror.mjs <暂存区目录> <仓库目录> [--xml]
//
// 规则来源：2026-10-26 Lead 把 README/CHANGELOG 直接写进仓库、没回写暂存区，
// 导致两边漂移；用户指出「暂存要和推送上去的文件一致」。
// 本脚本用于在提交前/推送后各跑一次。
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const [, , stageDir, repoDir] = process.argv;
if (!stageDir || !repoDir) {
  console.error('usage: node check_mirror.mjs <stageDir> <repoDir>');
  process.exit(2);
}

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '.vite', 'coverage']);

function walk(dir, base = dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else if (e.isFile()) out.push(relative(base, p).replace(/\\/g, '/'));
  }
  return out;
}

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16);

const stageFiles = new Set(walk(stageDir));
const repoFiles = new Set(walk(repoDir));

// 暂存区允许比仓库多出的「不推上去的东西」：发布用的音频、临时草稿
const STAGE_ONLY_OK = [/^_release_audio\//, /^_scratch\//, /^\./];

let onlyStage = [];
let onlyRepo = [];
let diff = [];

for (const f of stageFiles) {
  if (!repoFiles.has(f)) {
    if (!STAGE_ONLY_OK.some((re) => re.test(f))) onlyStage.push(f);
    continue;
  }
  if (sha(join(stageDir, f)) !== sha(join(repoDir, f))) diff.push(f);
}
for (const f of repoFiles) {
  if (!stageFiles.has(f)) onlyRepo.push(f);
}

console.log('=== 暂存区 vs 仓库 镜像校验 ===');
console.log(`暂存区 ${stageFiles.size} 个文件，仓库 ${repoFiles.size} 个文件\n`);

if (onlyRepo.length) {
  console.log(`✗ 仓库有、暂存区没有（${onlyRepo.length}）—— 这些改动没回流到暂存区：`);
  onlyRepo.sort().forEach((f) => console.log(`    ${f}`));
}
if (diff.length) {
  console.log(`\n✗ 两边内容不同（${diff.length}）—— 必须回写暂存区：`);
  diff.sort().forEach((f) => console.log(`    ${f}`));
}
if (onlyStage.length) {
  console.log(`\n? 暂存区有、仓库没有（${onlyStage.length}）—— 确认是否该推上去：`);
  onlyStage.sort().forEach((f) => console.log(`    ${f}`));
}

const bad = onlyRepo.length + diff.length;
if (bad === 0) {
  console.log('✓ 镜像一致。');
  process.exit(0);
}
console.log(`\n合计 ${bad} 处不一致。修法：以仓库为准复制回暂存区，或反过来——但两边必须一样。`);
process.exit(1);