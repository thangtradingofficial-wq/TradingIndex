/**
 * engine/RateDataEngine.js
 * Quản lý nạp dữ liệu đa chỉ số kinh tế vĩ mô 10 nền kinh tế và tự động đồng bộ (Auto-Sync)
 */

import { CENTRAL_BANKS, INDICATORS } from '../config.js';

export class RateDataEngine {
  constructor() {
    this._currentIndicator = 'policy_rates';
    this._dataCache = new Map(); // indicatorId -> dataset object
    this._data = null;
    this._listeners = new Set();
    this._syncTimer = null;
    this._isSyncing = false;
  }

  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _notify(event, payload) {
    for (const cb of this._listeners) {
      try {
        cb(event, payload);
      } catch (err) {
        console.error('[RateDataEngine] Listener error:', err);
      }
    }
  }

  getCurrentIndicator() {
    return this._currentIndicator;
  }

  getIndicatorMeta(indicatorId = this._currentIndicator) {
    return INDICATORS.find(i => i.id === indicatorId) || INDICATORS[0];
  }

  async loadInitialData() {
    return this.loadIndicator('policy_rates');
  }

  /**
   * Tải hoặc chuyển đổi sang chỉ số vĩ mô mong muốn
   * @param {string} indicatorId - 'policy_rates', 'real_rates', 'bond_yields_10y', 'inflation_cpi', 'unemployment', 'gdp_growth'
   */
  async loadIndicator(indicatorId) {
    const meta = this.getIndicatorMeta(indicatorId);
    this._currentIndicator = meta.id;

    // 1. Kiểm tra cache trong RAM
    if (this._dataCache.has(meta.id)) {
      this._data = this._dataCache.get(meta.id);
      this._notify('data-loaded', { indicator: meta, data: this._data });
      return this._data;
    }

    try {
      const fileName = meta.file || 'interest_rates.json';
      const res = await fetch(`./data/${fileName}?v=` + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${fileName}`);
      this._data = await res.json();
      console.log(`[RateDataEngine] Indicator [${meta.id}] loaded successfully (${fileName})`);

      // 2. Khôi phục từ localStorage cache nếu có cập nhật mới hơn
      try {
        const cachedStr = localStorage.getItem(`cb_synced_${meta.id}_cache`);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && cached.series && typeof cached.series === 'object') {
            for (const [code, cSeries] of Object.entries(cached.series)) {
              if (this._data.series[code] && Array.isArray(cSeries.data) && cSeries.data.length > 0) {
                const localData = this._data.series[code].data;
                const localLastPoint = localData[localData.length - 1];
                
                // Nối các điểm dữ liệu mới hơn (append) từ cache nếu có
                for (const pt of cSeries.data) {
                  if (localLastPoint && pt.time === localLastPoint.time) {
                    localLastPoint.value = pt.value;
                  } else if (localLastPoint && pt.time > localLastPoint.time) {
                    localData.push({ time: pt.time, value: pt.value });
                  }
                }
              }
            }
            if (cached.updated_at) this._data.updated_at = cached.updated_at;
          }
        }
      } catch (cacheErr) {
        console.warn(`[RateDataEngine] Cache restore error for ${meta.id}:`, cacheErr);
      }

      this._ensureMetricsCalculated();
      this._dataCache.set(meta.id, this._data);
      this._notify('data-loaded', { indicator: meta, data: this._data });
      return this._data;
    } catch (err) {
      console.error(`[RateDataEngine] Error loading indicator ${meta.id}:`, err);
      throw err;
    }
  }

  _ensureMetricsCalculated() {
    if (!this._data || !this._data.series) return;

    for (const bank of CENTRAL_BANKS) {
      const code = bank.code;
      const s = this._data.series[code];
      if (!s || !s.data || s.data.length === 0) continue;

      const lastPoint = s.data[s.data.length - 1];
      s.current = lastPoint.value;

      let prevVal = s.current;
      let lastChangeDate = s.data[0].time;
      for (let i = s.data.length - 1; i >= 0; i--) {
        if (s.data[i].value !== s.current) {
          prevVal = s.data[i].value;
          lastChangeDate = s.data[i + 1]?.time || s.data[0].time;
          break;
        }
      }

      s.change = parseFloat((s.current - prevVal).toFixed(2));
      s.changePercent = prevVal !== 0 ? parseFloat(((s.change / prevVal) * 100).toFixed(2)) : 0;
      s.lastChangeDate = lastChangeDate;
    }
  }

  getAllSeries() {
    return this._data ? this._data.series : {};
  }

  getSeriesData(code) {
    if (!this._data || !this._data.series[code]) return [];
    return this._data.series[code].data;
  }

  /**
   * Đồng bộ số liệu thời gian thực từ TradingView Scanner API cho chỉ số đang chọn
   */
  async syncLatestRates() {
    if (this._isSyncing) {
      console.log('[RateDataEngine] Sync already in progress, skipping...');
      return { hasChanges: false, changedPoints: [] };
    }

    const currentInd = this._currentIndicator;
    this._isSyncing = true;

    try {
      console.log(`[RateDataEngine] Checking updates for [${currentInd}] in parallel...`);
      let hasNewChanges = false;
      const changedPoints = [];
      const now = new Date();
      const currentMonthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
      const currentYearMonth = currentMonthStr.slice(0, 7);

      // Nếu là Lãi suất thực: tự động tính lại từ Policy Rate và CPI
      if (currentInd === 'real_rates') {
        const polData = this._dataCache.get('policy_rates') || (await this.loadIndicator('policy_rates'));
        const infData = this._dataCache.get('inflation_cpi') || (await this.loadIndicator('inflation_cpi'));
        await this.loadIndicator('real_rates'); // restore target

        for (const bank of CENTRAL_BANKS) {
          const pSeries = polData.series?.[bank.code];
          const iSeries = infData.series?.[bank.code];
          const rSeries = this._data.series?.[bank.code];
          if (pSeries && iSeries && rSeries) {
            const pVal = pSeries.data[pSeries.data.length - 1]?.value || 0;
            const iVal = iSeries.data[iSeries.data.length - 1]?.value || 0;
            // Exact Fisher Equation: (1+r) = (1+i)/(1+pi) => r = ((1+i/100)/(1+pi/100) - 1) * 100
            const realVal = 1 + iVal / 100 !== 0
              ? parseFloat((((1 + pVal / 100) / (1 + iVal / 100) - 1) * 100).toFixed(2))
              : parseFloat((pVal - iVal).toFixed(2));
            const lastRPoint = rSeries.data[rSeries.data.length - 1];
            if (lastRPoint && lastRPoint.value !== realVal) {
              lastRPoint.value = realVal;
              hasNewChanges = true;
              changedPoints.push({ code: bank.code, point: { time: currentMonthStr, value: realVal } });
            }
          }
        }
      } else {
        // Tải song song 10 mã của chỉ số tương ứng
        const fetchTasks = CENTRAL_BANKS.map(async (bank) => {
          const tickerSymbol = bank.tickers?.[currentInd] || bank.ticker;
          const rateVal = await this._fetchQuote(tickerSymbol);
          return { code: bank.code, ticker: tickerSymbol, rateVal };
        });

        const results = await Promise.allSettled(fetchTasks);

        for (const res of results) {
          if (res.status !== 'fulfilled') continue;
          const { code, ticker, rateVal } = res.value;
          if (rateVal === null || isNaN(rateVal)) continue;

          const s = this._data?.series[code];
          if (!s || !Array.isArray(s.data) || s.data.length === 0) continue;

          const lastPoint = s.data[s.data.length - 1];
          const lastYearMonth = lastPoint.time.slice(0, 7);

          if (lastYearMonth === currentYearMonth) {
            if (lastPoint.value !== rateVal || lastPoint.time !== currentMonthStr) {
              lastPoint.value = rateVal;
              lastPoint.time = currentMonthStr;
              hasNewChanges = true;
              changedPoints.push({ code, point: { time: currentMonthStr, value: rateVal } });
            }
          } else if (currentMonthStr > lastPoint.time) {
            const missingMonths = this._getIntermediateMonths(lastPoint.time, currentMonthStr);
            for (const m of missingMonths) {
              s.data.push({ time: m, value: lastPoint.value });
            }
            s.data.push({ time: currentMonthStr, value: rateVal });
            hasNewChanges = true;
            changedPoints.push({ code, point: { time: currentMonthStr, value: rateVal } });
          }
        }
      }

      if (hasNewChanges) {
        this._ensureMetricsCalculated();
        this._data.updated_at = new Date().toISOString();
        const payload = this._buildCleanPayload();

        // 1. Lưu vào localStorage cache
        try {
          localStorage.setItem(`cb_synced_${currentInd}_cache`, JSON.stringify(payload));
          if (currentInd === 'policy_rates') {
            localStorage.setItem('cb_synced_rates_cache', JSON.stringify(payload));
          }
        } catch (_) {}

        this._notify('data-updated', {
          indicator: this.getIndicatorMeta(),
          series: this._data.series,
          updated_at: this._data.updated_at,
          changes: changedPoints,
        });

        // 2. Gửi lên server backend nếu có
        try {
          await fetch(`/api/rate-sync?indicator=${encodeURIComponent(currentInd)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (_) {}
      }

      return { hasChanges: hasNewChanges, changedPoints };
    } finally {
      this._isSyncing = false;
    }
  }

  async _fetchQuote(symbol) {
    const cleanSymbol = symbol.startsWith('ECONOMICS:') || symbol.startsWith('TVC:')
      ? symbol
      : `ECONOMICS:${symbol}`;

    // 1. Thử qua backend proxy server
    const proxyUrl = `/api/rate-quote?ticker=${encodeURIComponent(cleanSymbol)}`;
    try {
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const quote = await res.json();
        if (quote && typeof quote.close === 'number') return quote.close;
      }
    } catch (_) {}

    // 2. Fallback gọi trực tiếp TradingView Scanner API
    try {
      const directUrl = `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(cleanSymbol)}&fields=close,change`;
      const directRes = await fetch(directUrl);
      if (directRes.ok) {
        const quote = await directRes.json();
        if (quote && typeof quote.close === 'number') return quote.close;
      }
    } catch (_) {}

    return null;
  }

  _getIntermediateMonths(fromTimeStr, toTimeStr) {
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

  _buildCleanPayload() {
    const SERIES_FIELDS = ['ticker', 'name', 'institution', 'flagIcon', 'color', 'current', 'change', 'changePercent', 'lastChangeDate', 'data'];
    const clean = {
      timeframe: this._data.timeframe || '1M',
      indicator: this._currentIndicator,
      title: this._data.title,
      unit: this._data.unit || '%',
      updated_at: this._data.updated_at,
      series: {},
    };
    for (const [code, s] of Object.entries(this._data.series)) {
      const cleanSeries = {};
      for (const field of SERIES_FIELDS) {
        if (s[field] !== undefined) cleanSeries[field] = s[field];
      }
      clean.series[code] = cleanSeries;
    }
    return clean;
  }

  startAutoSync(intervalMs = 300000) {
    if (this._syncTimer) clearInterval(this._syncTimer);
    this._syncTimer = setInterval(() => {
      this.syncLatestRates().catch(console.error);
    }, intervalMs);
  }

  stopAutoSync() {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }
  }
}
