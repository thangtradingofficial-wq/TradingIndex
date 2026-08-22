/**
 * server.js — Local Server cho Central Bank Policy Rates Comparison
 * Hỗ trợ ES Modules MIME, Proxy Scanner API miễn phí và Auto-Sync Cache vào data/interest_rates.json
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = __dirname;
// Default port: 3000 to avoid stale localhost:8080 browser cache
const PORTS = process.env.PORT ? [parseInt(process.env.PORT, 10)] : [3000, 3001, 8080, 8081, 8082];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

/**
 * Proxy gọi TradingView Scanner API lấy lãi suất mới nhất
 * URL: /api/rate-quote?ticker=USINTR
 */
async function handleRateQuoteProxy(req, res) {
  const send = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };

  try {
    const url = new URL(req.url, 'http://localhost');
    const ticker = String(url.searchParams.get('ticker') || '').toUpperCase();
    if (!ticker) return send(400, { error: 'Missing ticker' });

    const tvSymbol = `ECONOMICS:${ticker}`;
    const tvUrl = `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(tvSymbol)}&fields=close,change,description`;

    const r = await fetch(tvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!r.ok) {
      return send(r.status, { error: `TradingView returned status ${r.status}` });
    }

    const data = await r.json();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  } catch (err) {
    send(500, { error: err.message });
  }
}

const REQUIRED_BANKS = ['US', 'XM', 'VN', 'GB', 'CA', 'AU', 'NZ', 'CH', 'JP', 'CN'];

/**
 * Kiểm tra tính toàn vẹn dữ liệu trước khi cho phép ghi đè
 */
function validateRatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be a JSON object' };
  }
  if (!payload.series || typeof payload.series !== 'object') {
    return { valid: false, error: 'Payload missing series object' };
  }

  for (const code of REQUIRED_BANKS) {
    const s = payload.series[code];
    if (!s || typeof s !== 'object') {
      return { valid: false, error: `Missing bank series: ${code}` };
    }
    if (!Array.isArray(s.data) || s.data.length < 400) {
      return { valid: false, error: `Bank series ${code} data points too low (${s.data?.length || 0} < 400)` };
    }
    const lastPoint = s.data[s.data.length - 1];
    if (!lastPoint || typeof lastPoint.time !== 'string' || typeof lastPoint.value !== 'number') {
      return { valid: false, error: `Invalid last data point for bank ${code}` };
    }
  }

  return { valid: true };
}

/**
 * Ghi file nguyên tử (Atomic Write) an toàn trên Windows với backup tự động
 */
function safeAtomicWrite(filePath, dataStr) {
  const tmpPath = filePath + '.tmp';
  const bakPath = filePath + '.bak';

  // 1. Ghi file tạm
  fs.writeFileSync(tmpPath, dataStr, 'utf-8');

  // 2. Tạo bản sao lưu an toàn nếu file gốc đang tồn tại
  if (fs.existsSync(filePath)) {
    try {
      fs.copyFileSync(filePath, bakPath);
    } catch (bakErr) {
      console.warn('[server] Warning: Could not create backup file:', bakErr.message);
    }
  }

  // 3. Đổi tên nguyên tử (Atomic rename) kèm retry trên Windows
  let renamed = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.renameSync(tmpPath, filePath);
      renamed = true;
      break;
    } catch (err) {
      if (err.code === 'EPERM' || err.code === 'EBUSY') {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }
  }

  if (!renamed) {
    fs.copyFileSync(tmpPath, filePath);
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

/**
 * Lưu dữ liệu sync vào data/interest_rates.json
 * POST /api/rate-sync
 */
function handleRateSync(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 10 * 1024 * 1024) req.destroy();
  });

  req.on('end', () => {
    const send = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(obj));
    };

    try {
      const url = new URL(req.url, 'http://localhost');
      const indicatorId = url.searchParams.get('indicator') || 'policy_rates';
      
      const fileMap = {
        policy_rates: 'interest_rates.json',
        real_rates: 'real_rates.json',
        bond_yields_10y: 'bond_yields_10y.json',
        inflation_cpi: 'inflation_cpi.json',
        unemployment: 'unemployment.json',
        gdp_growth: 'gdp_growth.json'
      };
      const fileName = fileMap[indicatorId] || 'interest_rates.json';

      const payload = JSON.parse(body || '{}');
      const validation = validateRatePayload(payload);
      if (!validation.valid) {
        console.warn(`[server] Rate sync rejected for [${indicatorId}]: ${validation.error}`);
        return send(400, { ok: false, error: validation.error });
      }

      const filePath = path.join(ROOT, 'data', fileName);
      const payloadStr = JSON.stringify(payload);
      safeAtomicWrite(filePath, payloadStr);

      console.log(`[server] Synced [${indicatorId}] validated & saved to ${filePath}`);
      send(200, { ok: true, message: 'Saved successfully' });

      // Tự động Commit thẳng vào Repo HuggingFace Space
      pushToHuggingFaceHub(`data/${fileName}`, payloadStr).catch(e => {
        console.warn('[server] Background HF Hub commit warning:', e.message);
      });
    } catch (err) {
      console.error('[server] Rate sync error:', err);
      send(500, { ok: false, error: err.message });
    }
  });
}

/**
 * Commit file data/*.json thẳng lên HuggingFace Space repo
 */
async function pushToHuggingFaceHub(relPath, contentStr) {
  const envPath = path.join(ROOT, '.env');
  let token = process.env.HF_TOKEN || '';
  if (!token && fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf8');
    const match = text.match(/HF_TOKEN\s*=\s*([^\r\n]+)/);
    if (match) token = match[1].trim();
  }
  if (!token) return;

  try {
    const { uploadFile } = await import('@huggingface/hub');
    const blob = new Blob([contentStr], { type: 'application/json' });
    const repo = 'Thang6822/TradingIndex';
    const res = await uploadFile({
      repo: { type: 'space', name: repo },
      credentials: { accessToken: token },
      file: {
        path: relPath,
        content: blob
      },
      commitMessage: `Auto-sync ${relPath} from live dashboard`
    });
    console.log(`[server] HF Space repo auto-committed: ${res.commit?.url}`);
  } catch (e) {
    console.warn('[server] Could not commit to HF Space:', e.message);
  }
}

function handleStatic(req, res) {
  const send = (status, text) => {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
  };

  try {
    let reqPath = new URL(req.url, 'http://localhost').pathname;
    if (reqPath === '/') reqPath = '/index.html';

    const filePath = path.join(ROOT, reqPath);
    if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
      return send(403, 'Forbidden');
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return send(404, `File not found: ${reqPath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);

    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(content);
  } catch (err) {
    send(500, err.message);
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (pathname === '/api/rate-quote') {
    return handleRateQuoteProxy(req, res);
  }
  if (pathname === '/api/rate-sync' && req.method === 'POST') {
    return handleRateSync(req, res);
  }
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', service: 'CentralBankRates' }));
  }

  handleStatic(req, res);
});

function openBrowser(url) {
  const p = process.platform;
  if (p === 'win32') {
    spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } else if (p === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}

function startServer(portIdx = 0) {
  if (portIdx >= PORTS.length) {
    console.error('All ports in use. Cannot start server.');
    process.exit(1);
  }

  const port = PORTS[portIdx];
  server.listen(port, '0.0.0.0', () => {
    const url = `http://localhost:${port}`;
    console.log(`\n======================================================`);
    console.log(` Central Bank Rates Terminal running at: ${url}`);
    console.log(`======================================================\n`);

    if (process.argv.includes('--open') || process.env.AUTO_OPEN === '1') {
      openBrowser(url);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying next port...`);
      startServer(portIdx + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
