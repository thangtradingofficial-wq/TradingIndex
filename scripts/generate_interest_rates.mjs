/**
 * scripts/generate_interest_rates.mjs
 * Generates official policy rates history for 10 Central Banks
 * Compiles 1M (Monthly resolution: 1 point per month) and 1D datasets (1990 - 2026)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function main() {
  console.log('1. Fetching comprehensive BIS daily policy rates (AU, CA, CH, CN, GB, JP, NZ, US, XM, DE)...');
  const bisUrl = 'https://stats.bis.org/api/v1/data/WS_CBPOL/D.US+XM+DE+GB+CH+JP+CA+AU+NZ+CN?format=csv';
  const res = await fetch(bisUrl);
  if (!res.ok) throw new Error(`BIS fetch failed with status ${res.status}`);
  const text = await res.text();
  console.log(`BIS data received (${(text.length / 1024 / 1024).toFixed(2)} MB)`);

  const rawByCountry = {
    US: {}, XM: {}, DE: {}, GB: {}, CH: {}, JP: {}, CA: {}, AU: {}, NZ: {}, CN: {}
  };

  const lines = text.trim().split('\n');
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const match = row.match(/^D,([A-Z]{2}),.*?,(\d{4}-\d{2}-\d{2}),([0-9.-]+)/);
    if (match) {
      const c = match[1];
      const date = match[2];
      const val = parseFloat(match[3]);
      if (rawByCountry[c] && !isNaN(val)) {
        rawByCountry[c][date] = val;
      }
    }
  }

  // Vietnam State Bank (SBV) historical rate decisions from 1990 to present
  const vnChanges = [
    { date: '1990-01-01', rate: 24.0 },
    { date: '1992-06-01', rate: 18.0 },
    { date: '1994-01-01', rate: 15.0 },
    { date: '1996-01-01', rate: 14.4 },
    { date: '1997-06-01', rate: 12.0 },
    { date: '1998-08-01', rate: 10.0 },
    { date: '1999-06-01', rate: 7.0 },
    { date: '2000-01-01', rate: 5.0 },
    { date: '2005-01-01', rate: 6.0 },
    { date: '2008-02-01', rate: 7.5 },
    { date: '2008-05-19', rate: 13.0 },
    { date: '2008-06-11', rate: 15.0 },
    { date: '2008-10-21', rate: 14.0 },
    { date: '2008-11-05', rate: 13.0 },
    { date: '2008-11-20', rate: 12.0 },
    { date: '2008-12-05', rate: 10.0 },
    { date: '2008-12-22', rate: 9.5 },
    { date: '2009-02-01', rate: 7.0 },
    { date: '2009-12-01', rate: 8.0 },
    { date: '2010-11-05', rate: 9.0 },
    { date: '2011-02-17', rate: 11.0 },
    { date: '2011-03-08', rate: 12.0 },
    { date: '2011-04-01', rate: 13.0 },
    { date: '2011-05-01', rate: 14.0 },
    { date: '2011-10-10', rate: 15.0 },
    { date: '2012-03-13', rate: 14.0 },
    { date: '2012-04-11', rate: 13.0 },
    { date: '2012-05-28', rate: 12.0 },
    { date: '2012-07-01', rate: 10.0 },
    { date: '2012-12-24', rate: 9.0 },
    { date: '2013-03-26', rate: 8.0 },
    { date: '2013-05-13', rate: 7.0 },
    { date: '2014-03-18', rate: 6.5 },
    { date: '2017-07-10', rate: 6.25 },
    { date: '2019-09-16', rate: 6.0 },
    { date: '2020-03-17', rate: 5.0 },
    { date: '2020-05-13', rate: 4.5 },
    { date: '2020-10-01', rate: 4.0 },
    { date: '2022-09-23', rate: 5.0 },
    { date: '2022-10-25', rate: 6.0 },
    { date: '2023-04-03', rate: 5.5 },
    { date: '2023-05-25', rate: 5.0 },
    { date: '2023-06-19', rate: 4.5 }
  ];

  const seriesMeta = {
    US: { ticker: 'USINTR', name: 'Mỹ', institution: 'Federal Reserve', flagIcon: './assets/flags/us.svg', color: '#2563EB' },
    XM: { ticker: 'EUINTR', name: 'Khu vực Euro', institution: 'European Central Bank', flagIcon: './assets/flags/eu.svg', color: '#EAB308' },
    VN: { ticker: 'VNINTR', name: 'Việt Nam', institution: 'State Bank of Vietnam', flagIcon: './assets/flags/vn.svg', color: '#16A34A' },
    GB: { ticker: 'GBINTR', name: 'Anh', institution: 'Bank of England', flagIcon: './assets/flags/gb.svg', color: '#F43F5E' },
    CA: { ticker: 'CAINTR', name: 'Canada', institution: 'Bank of Canada', flagIcon: './assets/flags/ca.svg', color: '#92400E' },
    AU: { ticker: 'AUINTR', name: 'Úc', institution: 'Reserve Bank of Australia', flagIcon: './assets/flags/au.svg', color: '#F97316' },
    NZ: { ticker: 'NZINTR', name: 'New Zealand', institution: 'Reserve Bank of New Zealand', flagIcon: './assets/flags/nz.svg', color: '#06B6D4' },
    CH: { ticker: 'CHINTR', name: 'Thụy Sỹ', institution: 'Swiss National Bank', flagIcon: './assets/flags/ch.svg', color: '#475569' },
    JP: { ticker: 'JPINTR', name: 'Nhật Bản', institution: 'Bank of Japan', flagIcon: './assets/flags/jp.svg', color: '#9333EA' },
    CN: { ticker: 'CNINTR', name: 'Trung Quốc', institution: "People's Bank of China", flagIcon: './assets/flags/cn.svg', color: '#DC2626' }
  };

  // Generate monthly date list (1M timeframe: YYYY-MM-01) from 1990-01-01 to present
  const startYear = 1990;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const monthList = [];
  for (let y = startYear; y <= currentYear; y++) {
    const endM = (y === currentYear) ? currentMonth : 12;
    for (let m = 1; m <= endM; m++) {
      const mm = String(m).padStart(2, '0');
      monthList.push(`${y}-${mm}-01`);
    }
  }

  console.log(`Generating 1M (Monthly timeframe) series: ${monthList.length} monthly points per country (1990 - 2026)...`);

  const result = {
    timeframe: '1M',
    updated_at: new Date().toISOString(),
    series: {}
  };

  for (const [code, meta] of Object.entries(seriesMeta)) {
    const monthlyPoints = [];
    let currentRate = 0;

    if (code === 'VN') {
      let vnIdx = 0;
      for (const dt of monthList) {
        while (vnIdx < vnChanges.length && vnChanges[vnIdx].date <= dt) {
          currentRate = vnChanges[vnIdx].rate;
          vnIdx++;
        }
        monthlyPoints.push({ time: dt, value: currentRate });
      }
    } else {
      const sourceMap = rawByCountry[code];
      const datesInBis = Object.keys(sourceMap).sort();

      // Khởi tạo currentRate = rate hiệu lực tại monthList[0] (1990-01-01)
      if (datesInBis.length > 0) {
        for (const d of datesInBis) {
          if (d <= monthList[0]) currentRate = sourceMap[d];
          else break;
        }
        if (currentRate === 0 && datesInBis[0] > monthList[0]) {
          if (code === 'XM' && rawByCountry.DE) {
            const deDates = Object.keys(rawByCountry.DE).sort();
            for (const d of deDates) {
              if (d <= monthList[0]) currentRate = rawByCountry.DE[d];
              else break;
            }
          } else {
            currentRate = sourceMap[datesInBis[0]];
          }
        }
      }

      // Pre-build yearMonth → lastRate Map để tra cứu O(1) thay vì O(n) mỗi tháng
      // Fix O(n²) → O(n + m): 441 tháng × ~8000 days/country = 32M iterations → ~8K iterations
      const ymToRate = new Map();
      for (const [d, val] of Object.entries(sourceMap)) {
        const ym = d.slice(0, 7); // 'YYYY-MM'
        // Lấy giá trị ngày cuối cùng trong tháng (overwrite nếu có nhiều ngày cùng tháng)
        if (!ymToRate.has(ym) || d > ymToRate.get(ym).date) {
          ymToRate.set(ym, { date: d, value: val });
        }
      }

      // Pre-build DE map cho XM pre-1999
      let deYmToRate = null;
      if (code === 'XM' && rawByCountry.DE) {
        deYmToRate = new Map();
        for (const [d, val] of Object.entries(rawByCountry.DE)) {
          const ym = d.slice(0, 7);
          if (!deYmToRate.has(ym) || d > deYmToRate.get(ym).date) {
            deYmToRate.set(ym, { date: d, value: val });
          }
        }
      }

      for (const dt of monthList) {
        const yearMonth = dt.slice(0, 7); // 'YYYY-MM'

        // O(1) lookup: có dữ liệu BIS cho tháng này không?
        const ymEntry = ymToRate.get(yearMonth);
        if (ymEntry) currentRate = ymEntry.value;

        // XM pre-1999: dùng Bundesbank (DE) thay thế ECB chưa tồn tại
        if (deYmToRate && dt < '1999-01-01') {
          const deEntry = deYmToRate.get(yearMonth);
          if (deEntry) currentRate = deEntry.value;
        }

        monthlyPoints.push({ time: dt, value: currentRate });
      }
    }

    // Tính change, changePercent và lastChangeDate
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
    const changeVal = parseFloat((latestVal - prevVal).toFixed(2));
    const changePct = prevVal !== 0 ? parseFloat(((changeVal / prevVal) * 100).toFixed(2)) : 0;

    result.series[code] = {
      ticker: meta.ticker,
      name: meta.name,
      institution: meta.institution,
      flagIcon: meta.flagIcon,
      color: meta.color,
      current: latestVal,
      change: changeVal,
      changePercent: changePct,
      lastChangeDate,
      data: monthlyPoints
    };
  }

  // 2. Đồng bộ thời gian thực từ TradingView Scanner API để bù đắp độ trễ dữ liệu của BIS
  console.log('\n2. Syncing real-time policy rates from TradingView Scanner API...');
  for (const [code, s] of Object.entries(result.series)) {
    try {
      const tvUrl = `https://scanner.tradingview.com/symbol?symbol=ECONOMICS:${encodeURIComponent(s.ticker)}&fields=close,change,description`;
      const quoteRes = await fetch(tvUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (quoteRes.ok) {
        const quote = await quoteRes.json();
        if (quote && typeof quote.close === 'number' && !isNaN(quote.close)) {
          const liveRate = quote.close;
          const lastPoint = s.data[s.data.length - 1];
          if (lastPoint && lastPoint.value !== liveRate) {
            console.log(`  Updating [${s.ticker}] from BIS ${lastPoint.value}% -> Live ${liveRate}%`);
            lastPoint.value = liveRate;
          }
        }
      }
    } catch (e) {
      console.warn(`  Warning: Could not fetch live quote for ${s.ticker}:`, e.message);
    }
  }

  // 3. Tính toán lại toàn bộ metrics chính xác sau khi áp dụng live rate
  for (const [code, s] of Object.entries(result.series)) {
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

  const dataDir = path.join(ROOT, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const outPath = path.join(dataDir, 'interest_rates.json');
  // Atomic write + minified (giảm 60% so với pretty-print)
  const tmpPath = outPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(result), 'utf-8');
  fs.renameSync(tmpPath, outPath);

  const fileSizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`\nSuccessfully saved 1M monthly dataset to ${outPath} (${fileSizeKB} KB)`);

  for (const c of Object.keys(result.series)) {
    const s = result.series[c];
    console.log(`[${s.ticker.padEnd(7)}] ${s.name.padEnd(16)}: ${s.current.toFixed(2)}% | ${s.data.length} pts | lastChange: ${s.lastChangeDate}`);
  }

}

main().catch(err => {
  console.error('Error generating interest rates dataset:', err);
  process.exit(1);
});
