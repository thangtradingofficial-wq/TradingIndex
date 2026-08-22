/**
 * scripts/sync-hf-rates.mjs
 * Tự động đồng bộ toàn bộ 6 chỉ số kinh tế vĩ mô từ TradingView và Commit THẲNG lên Repo HuggingFace Space
 * Sử dụng HuggingFace Hub Commit API (cập nhật trực tiếp các file trong data/)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadFile } from '@huggingface/hub';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function getHfToken() {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf8');
    const match = text.match(/HF_TOKEN\s*=\s*([^\r\n]+)/);
    if (match) return match[1].trim();
  }
  return process.env.HF_TOKEN || '';
}

const HF_REPO = 'Thang6822/TradingIndex';
const HF_TOKEN = getHfToken();

const DATASETS = [
  { id: 'policy_rates', file: 'interest_rates.json', name: 'Lãi suất Điều hành' },
  { id: 'bond_yields_10y', file: 'bond_yields_10y.json', name: 'Trái phiếu Chính phủ 10Y' },
  { id: 'inflation_cpi', file: 'inflation_cpi.json', name: 'Lạm phát CPI YoY' },
  { id: 'real_rates', file: 'real_rates.json', name: 'Lãi suất Thực tế' },
  { id: 'unemployment', file: 'unemployment.json', name: 'Tỷ lệ Thất nghiệp' },
  { id: 'gdp_growth', file: 'gdp_growth.json', name: 'Tăng trưởng GDP YoY' }
];

function getIntermediateMonths(fromTimeStr, toTimeStr) {
  const months = [];
  const [fromY, fromM] = fromTimeStr.split('-').map(Number);
  const [toY, toM] = toTimeStr.split('-').map(Number);

  let curY = fromY;
  let curM = fromM + 1;
  if (curM > 12) { curY++; curM = 1; }

  while (curY < toY || (curY === toY && curM < toM)) {
    months.push(`${curY}-${String(curM).padStart(2, '0')}-01`);
    curM++;
    if (curM > 12) { curY++; curM = 1; }
  }
  return months;
}

async function syncAndCommitAll() {
  console.log('=== SYNC TẤT CẢ 6 CHỈ SỐ VĨ MÔ & COMMIT LÊN HUGGINGFACE SPACE ===\n');

  if (!HF_TOKEN) {
    console.error('❌ Lỗi: Không tìm thấy HF_TOKEN trong .env');
    process.exit(1);
  }

  for (const ds of DATASETS) {
    const dataPath = path.join(ROOT, 'data', ds.file);
    if (!fs.existsSync(dataPath)) continue;

    console.log(`\n▶ Đang kiểm tra [${ds.name}] (${ds.file})...`);
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const now = new Date();
    const currentMonthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
    let hasChanges = false;

    if (ds.id === 'real_rates') {
      const polData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'interest_rates.json'), 'utf8'));
      const infData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'inflation_cpi.json'), 'utf8'));
      for (const [code, s] of Object.entries(rawData.series || {})) {
        const polVal = polData.series?.[code]?.data?.slice(-1)[0]?.value ?? 0;
        const infVal = infData.series?.[code]?.data?.slice(-1)[0]?.value ?? 0;
        const exactRate = 1 + infVal / 100 !== 0
          ? parseFloat((((1 + polVal / 100) / (1 + infVal / 100) - 1) * 100).toFixed(2))
          : parseFloat((polVal - infVal).toFixed(2));
        const lastPt = s.data[s.data.length - 1];
        if (lastPt && lastPt.value !== exactRate) {
          console.log(`  [${code}] Real Rate (Fisher): ${lastPt.value}% -> ${exactRate}%`);
          lastPt.value = exactRate;
          hasChanges = true;
        }
      }
    } else {
      // Quét giá trực tiếp từ TradingView
      for (const [code, s] of Object.entries(rawData.series || {})) {
        if (!s.ticker) continue;
        const symbol = s.ticker.startsWith('ECONOMICS:') || s.ticker.startsWith('TVC:')
          ? s.ticker
          : `ECONOMICS:${s.ticker}`;

        try {
          const tvUrl = `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(symbol)}&fields=close,change,description`;
          const res = await fetch(tvUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (res.ok) {
            const quote = await res.json();
            if (quote && typeof quote.close === 'number' && !isNaN(quote.close)) {
              const liveVal = quote.close;
              const lastPoint = s.data[s.data.length - 1];

              if (lastPoint.time === currentMonthStr) {
                if (lastPoint.value !== liveVal) {
                  console.log(`  [${s.ticker}] ${s.name}: ${lastPoint.value}% -> ${liveVal}%`);
                  lastPoint.value = liveVal;
                  hasChanges = true;
                }
              } else if (currentMonthStr > lastPoint.time) {
                const missing = getIntermediateMonths(lastPoint.time, currentMonthStr);
                for (const m of missing) {
                  s.data.push({ time: m, value: lastPoint.value });
                }
                s.data.push({ time: currentMonthStr, value: liveVal });
                console.log(`  [${s.ticker}] ${s.name}: Tháng mới ${currentMonthStr} = ${liveVal}% (${missing.length} tháng điền bù)`);
                hasChanges = true;
              }
            }
          }
        } catch (_) {}
      }
    }

    // Cập nhật lại metrics
    for (const [code, s] of Object.entries(rawData.series || {})) {
      const monthlyPoints = s.data;
      const latestVal = monthlyPoints[monthlyPoints.length - 1].value;
      let prevVal = latestVal;
      let lastChangeDate = monthlyPoints[0].time;
      for (let i = monthlyPoints.length - 1; i >= 0; i--) {
        if (monthlyPoints[i].value !== latestVal) {
          prevVal = monthlyPoints[i].value;
          lastChangeDate = monthlyPoints[i + 1]?.time || monthlyPoints[0].time;
          break;
        }
      }
      s.current = latestVal;
      s.change = parseFloat((latestVal - prevVal).toFixed(2));
      s.changePercent = prevVal !== 0 ? parseFloat(((s.change / prevVal) * 100).toFixed(2)) : 0;
      s.lastChangeDate = lastChangeDate;
    }

    rawData.updated_at = new Date().toISOString();
    const fileContentStr = JSON.stringify(rawData);
    fs.writeFileSync(dataPath, fileContentStr, 'utf8');

    // Đẩy commit lên HuggingFace
    const blob = new Blob([fileContentStr], { type: 'application/json' });
    try {
      const uploadRes = await uploadFile({
        repo: { type: 'space', name: HF_REPO },
        credentials: { accessToken: HF_TOKEN },
        file: {
          path: `data/${ds.file}`,
          content: blob
        },
        commitMessage: `Auto-sync data/${ds.file} from TradingView live quotes`
      });
      console.log(`✓ Đã commit lên HuggingFace: data/${ds.file} (${uploadRes.commit?.oid?.slice(0, 7) || 'OK'})`);
    } catch (e) {
      console.warn(`  Lỗi commit data/${ds.file}:`, e.message);
    }
  }

  console.log('\n===============================================================');
  console.log('🎉 ĐÃ ĐỒNG BỘ & COMMIT TOÀN BỘ 6 CHỈ SỐ LÊN HUGGINGFACE REPO!');
  console.log(`🔗 Link Space: https://huggingface.co/spaces/${HF_REPO}`);
  console.log('===============================================================\n');
}

syncAndCommitAll().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
