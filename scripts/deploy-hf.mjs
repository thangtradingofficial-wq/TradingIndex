/**
 * scripts/deploy-hf.mjs — Đóng gói + Obfuscate + Deploy lên HuggingFace Space (STATIC)
 *
 * Sử dụng:
 *   node scripts/deploy-hf.mjs              → Build deploy/ + obfuscate (không push)
 *   node scripts/deploy-hf.mjs --push       → Build + push + verify
 *   node scripts/deploy-hf.mjs --push --rebuild → Ép build lại deploy/ từ đầu
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const TOOLS = path.join(__dirname, 'obf-tools');
const PUSH = process.argv.includes('--push');

const SPACE_NAME = 'TradingIndex';
const BUILT_MARKER = path.join(DEPLOY, '.built');
const REBUILD = process.argv.includes('--rebuild') || process.argv.includes('--push');
const SKIP_BUILD = fs.existsSync(BUILT_MARKER) && !REBUILD;

// ── 1. Đọc .env ───────────────────────────────────────────────────────────────
function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const env = parseEnv(path.join(ROOT, '.env'));
const HF_TOKEN = env.HF_TOKEN || env.HF_TOKEN_FINEGRAINED || '';
if (PUSH && !HF_TOKEN) {
  console.error('❌ Không tìm thấy HF_TOKEN trong .env');
  process.exit(1);
}

// ── 2. Dọn + copy các file cần thiết ──────────────────────────────────────────
if (SKIP_BUILD) {
  console.log('1-5. BỎ QUA build (deploy/.built tồn tại — dùng --rebuild hoặc --push để build lại)');
} else {
  console.log('1. Copy repo → deploy/ ...');
  fs.rmSync(DEPLOY, { recursive: true, force: true });
  fs.mkdirSync(DEPLOY, { recursive: true });

  for (const dir of ['engine', 'ui', 'assets', 'data']) {
    const srcDir = path.join(ROOT, dir);
    if (fs.existsSync(srcDir)) {
      fs.cpSync(srcDir, path.join(DEPLOY, dir), { recursive: true });
    }
  }
  for (const f of ['index.html', 'style.css', 'app.js', 'config.js']) {
    const srcFile = path.join(ROOT, f);
    if (fs.existsSync(srcFile)) {
      fs.cpSync(srcFile, path.join(DEPLOY, f));
    }
  }

  // ── 3. Cài đặt công cụ Obfuscator ──────────────────────────────────────────
  console.log('2. Chuẩn bị javascript-obfuscator ...');
  if (!fs.existsSync(path.join(TOOLS, 'node_modules', 'javascript-obfuscator'))) {
    execSync('npm install --prefix ' + JSON.stringify(TOOLS) + ' --no-audit --no-fund javascript-obfuscator', { stdio: 'inherit' });
  }
  const OBF = path.join(TOOLS, 'node_modules', '.bin', 'javascript-obfuscator' + (process.platform === 'win32' ? '.cmd' : ''));

  // ── 4. Obfuscate toàn bộ JS ────────────────────────────────────────────────
  function walkJs(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.js'))
      .map(f => path.join(dir, f).replace(DEPLOY + path.sep, '').split(path.sep).join('/'));
  }

  const JS_FILES = [
    'app.js',
    'config.js',
    ...walkJs(path.join(DEPLOY, 'engine')),
    ...walkJs(path.join(DEPLOY, 'ui'))
  ];

  console.log('3. Obfuscate ' + JS_FILES.length + ' file JS (mã hóa chuỗi Base64 + làm rối logic) ...');
  for (const rel of JS_FILES) {
    const abs = path.join(DEPLOY, rel);
    const tmp = abs + '.obf.tmp.js';
    const args = [
      JSON.stringify(abs),
      '--output', JSON.stringify(tmp),
      '--rename-globals', 'false',
      '--identifier-names-generator', 'hexadecimal',
      '--string-array', 'true',
      '--string-array-encoding', 'base64',
      '--string-array-threshold', '1',
      '--control-flow-flattening', 'true',
      '--control-flow-flattening-threshold', '0.75',
      '--dead-code-injection', 'true',
      '--dead-code-injection-threshold', '0.4',
      '--self-defending', 'false',
      '--simplify', 'true',
      '--compact', 'true',
      '--unicode-escape-sequence', 'false',
    ];
    try {
      execSync(JSON.stringify(OBF) + ' ' + args.join(' '), { stdio: 'pipe', shell: 'cmd.exe' });
    } catch (e) {
      console.error('  ✗ Obfuscate thất bại:', rel, '\n', String(e.stderr || e.message).slice(0, 500));
      process.exit(1);
    }
    fs.renameSync(tmp, abs);
    process.stdout.write('  ✓ ' + rel + '\n');
  }

  // ── 5. Smoke test module ────────────────────────────────────────────────────
  console.log('4. Smoke test module ...');
  execSync('node --check ' + JSON.stringify(path.join(DEPLOY, 'config.js')), { stdio: 'inherit' });
  execSync('node --check ' + JSON.stringify(path.join(DEPLOY, 'app.js')), { stdio: 'inherit' });
  const engineUrl = pathToFileURL(path.join(DEPLOY, 'engine', 'RateDataEngine.js')).href;
  const cfgUrl = pathToFileURL(path.join(DEPLOY, 'config.js')).href;
  execSync(`node --input-type=module -e "import('${engineUrl}').then(m => { if (!m.RateDataEngine) throw new Error('missing RateDataEngine export'); console.log('  OK RateDataEngine export'); })"`, { stdio: 'inherit', shell: 'cmd.exe' });
  execSync(`node --input-type=module -e "import('${cfgUrl}').then(m => { if (!m.CENTRAL_BANKS || m.CENTRAL_BANKS.length === 0) throw new Error('no CENTRAL_BANKS'); console.log('  OK config: ' + m.CENTRAL_BANKS.length + ' banks'); })"`, { stdio: 'inherit', shell: 'cmd.exe' });

  // ── 6. README cho Static Space ──────────────────────────────────────────────
  fs.writeFileSync(path.join(DEPLOY, 'README.md'), `---
title: TradingIndex
emoji: 📊
colorFrom: blue
colorTo: indigo
sdk: static
pinned: false
---

# Central Bank Policy Rates Comparison (TradingIndex)

Biểu đồ so sánh lãi suất 10 Ngân hàng Trung ương lớn trên thế giới (TradingView Stepped-Line Edition).

Khung 1M (Monthly Resolution) từ 1990 - nay, tự động cập nhật số liệu mới nhất.
`);
  fs.writeFileSync(path.join(DEPLOY, '.gitignore'), '.env\nnode_modules\n');
  fs.writeFileSync(BUILT_MARKER, 'ok');
}

console.log('\n✅ Build deploy/ hoàn tất');

// ── 7. Push lên HuggingFace ──────────────────────────────────────────────────
if (!PUSH) {
  console.log('(Chạy với --push để push lên Space)');
  process.exit(0);
}

console.log('\n5. Kiểm tra tài khoản HuggingFace ...');
const whoami = await (await fetch('https://huggingface.co/api/whoami-v2', { headers: { Authorization: 'Bearer ' + HF_TOKEN } })).json();
const user = whoami.name;
if (!user) { console.error('❌ Token không hợp lệ'); process.exit(1); }
console.log('  Tài khoản:', user);

const REPO_ID = user + '/' + SPACE_NAME;
console.log(`6. Tạo hoặc lấy Space: ${REPO_ID} ...`);
let createResp = await fetch('https://huggingface.co/api/repos/create', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + HF_TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: SPACE_NAME, type: 'space', sdk: 'static', private: false }),
});
if (createResp.status === 409) {
  console.log('  Space đã tồn tại, dùng lại:', REPO_ID);
} else if (!createResp.ok) {
  const body = await createResp.text();
  console.error('  ❌ Tạo space thất bại (' + createResp.status + '):', body.slice(0, 300));
  process.exit(1);
} else {
  console.log('  ✓ Space đã tạo thành công:', REPO_ID);
}

console.log('7. Git push lên HuggingFace ...');
process.chdir(DEPLOY);
execSync('git init -b main', { stdio: 'inherit' });
execSync('git add -A', { stdio: 'inherit' });
try { execSync('git -c user.email="tradingindex@local" -c user.name="TradingIndex" commit -m "Deploy TradingIndex (static, obfuscated)"', { stdio: 'inherit' }); } catch {}
try { execSync('git remote remove origin', { stdio: 'ignore' }); } catch {}
execSync(`git remote add origin https://huggingface.co/spaces/${REPO_ID}.git`, { stdio: 'inherit' });
execSync(`git push -f -u https://${user}:${HF_TOKEN}@huggingface.co/spaces/${REPO_ID}.git main`, { stdio: 'inherit' });

console.log('\n===============================================================');
console.log('🎉 ĐÃ PUSH THÀNH CÔNG!');
console.log(`🔗 Link Space: https://huggingface.co/spaces/${REPO_ID}`);
console.log('===============================================================\n');
