/**
 * app.js — Main Controller for Central Bank Interest Rates Dashboard
 * Khởi tạo dữ liệu khung 1M (Monthly Resolution), quản lý biểu đồ, nhãn cờ quốc gia trục phải và hover tooltip.
 */

import { CENTRAL_BANKS, TIME_RANGES, AUTO_SYNC_INTERVAL_MS } from './config.js?v=20260822_ios';
import { RateDataEngine } from './engine/RateDataEngine.js?v=20260822_ios';
import { ChartManager } from './ui/ChartManager.js?v=20260822_ios';
import { Toolbar } from './ui/Toolbar.js?v=20260822_ios';
import { TooltipPlugin } from './ui/TooltipPlugin.js?v=20260822_ios';
import { RightEndBadges } from './ui/RightEndBadges.js?v=20260822_ios';
import { SpreadModal } from './ui/SpreadModal.js?v=20260822_ios';
import { MacroMatrixModal } from './ui/MacroMatrixModal.js?v=20260822_ios';

class App {
  constructor() {
    this._dataEngine = new RateDataEngine();
    this._chartManager = null;
    this._toolbar = null;
    this._tooltipPlugin = null;
    this._rightEndBadges = null;
    this._spreadModal = null;
    this._macroMatrixModal = null;
    this._currentTheme = localStorage.getItem('tv_theme') || 'light';
    this._visibilityMap = {};

    for (const b of CENTRAL_BANKS) {
      this._visibilityMap[b.code] = b.defaultVisible !== false;
    }
  }

  async init() {
    console.log('[App] Initializing Central Bank Rates Dashboard (1M Timeframe)...');
    this._setupTheme(this._currentTheme);

    const chartContainer = document.getElementById('chart-container');
    const overlayContainer = document.getElementById('overlay-container');

    // 1. Khởi tạo ChartManager
    this._chartManager = new ChartManager(chartContainer);
    this._chartManager.init(this._currentTheme);

    // 2. Khởi tạo Nhãn giá gắn Quốc kỳ SVG trục phải (RightEndBadges)
    this._rightEndBadges = new RightEndBadges(overlayContainer, this._chartManager);

    // 3. Khởi tạo Tooltip Plugin (Hover chuột vào đâu hiển thị thông tin ở đó)
    this._tooltipPlugin = new TooltipPlugin(overlayContainer);

    // 4. Khởi tạo các Modal nâng cao (Spread Mode & Macro Heatmap)
    this._spreadModal = new SpreadModal({
      dataEngine: this._dataEngine,
      onApplySpread: (codeA, codeB) => this._handleApplySpread(codeA, codeB),
    });

    this._macroMatrixModal = new MacroMatrixModal({
      dataEngine: this._dataEngine,
    });

    // 5. Khởi tạo Toolbar (Header Flag Pills + Indicator Switcher + Footer Range Selector + Action Buttons)
    this._toolbar = new Toolbar({
      onIndicatorChange: (indicatorId) => this._handleIndicatorChange(indicatorId),
      onRangeChange: (rangeId) => this._handleRangeChange(rangeId),
      onThemeToggle: (themeName) => this._setupTheme(themeName),
      onAutoFit: () => {
        this._chartManager.fitContent();
        this._rightEndBadges?.updatePositions();
      },
      onSyncNow: () => this._handleManualSync(),
      onToggleCountry: (code, isVisible) => this._handleToggleCountry(code, isVisible),
      onToggleAll: (isVisible) => this._handleToggleAll(isVisible),
      onOpenSpread: () => this._spreadModal.open(),
      onOpenMatrix: () => this._macroMatrixModal.open(),
      onExportCsv: () => this._exportCsv(),
      onExportPng: () => this._exportPng(),
    });
    this._toolbar.init(this._currentTheme);

    // 5. Lắng nghe di chuột Crosshair trên biểu đồ
    this._setupCrosshair();

    // 6. Nạp dữ liệu lịch sử khung 1M (Monthly)
    await this._loadData();

    // 7. Căn chỉnh hiển thị toàn cảnh biểu đồ tháng
    this._chartManager.fitContent();
    setTimeout(() => this._rightEndBadges?.updatePositions(), 150);

    // 8. Ẩn màn hình nạp (Loading Screen)
    this._hideLoadingScreen();

    // 9. Đồng bộ ngay lúc khởi chạy trong nền & Bật Auto-Sync định kỳ
    setTimeout(() => this._dataEngine.syncLatestRates().catch(() => {}), 500);
    this._dataEngine.startAutoSync(AUTO_SYNC_INTERVAL_MS);
  }

  _setupTheme(themeName) {
    this._currentTheme = themeName;
    localStorage.setItem('tv_theme', themeName);
    document.body.className = themeName === 'dark' ? 'dark-theme' : 'light-theme';
    if (this._chartManager) {
      this._chartManager.setTheme(themeName);
    }
  }

  async _loadData() {
    this._updateLoadingStatus('Đang nạp dữ liệu lãi suất khung 1M (1990 - nay)...');
    try {
      const data = await this._dataEngine.loadInitialData();
      const seriesMap = this._dataEngine.getAllSeries();

      // Cập nhật biểu đồ, nhãn cờ trục phải và thanh công cụ
      this._chartManager.setData(seriesMap);
      this._rightEndBadges.setSeriesData(seriesMap);
      this._toolbar.setRatesData(seriesMap);
      if (data.updated_at) this._toolbar.setUpdatedAt(data.updated_at);

      // Lắng nghe cập nhật mới từ DataEngine
      this._dataEngine.subscribe((event, payload) => {
        if (event === 'data-updated') {
          const updatedSeries = this._dataEngine.getAllSeries();

          // Dùng series.update() cho từng điểm thay đổi — hiệu quả hơn setData() toàn bộ
          if (payload?.changes?.length > 0) {
            for (const { code, point } of payload.changes) {
              this._chartManager.updatePoint(code, point);
            }
          } else {
            // Fallback: full redraw nếu không có thông tin cụ thể
            this._chartManager.setData(updatedSeries);
          }

          this._rightEndBadges.setSeriesData(updatedSeries);
          this._toolbar.setRatesData(updatedSeries);
          if (payload?.updated_at) this._toolbar.setUpdatedAt(payload.updated_at);
        }
      });
    } catch (err) {
      console.error('[App] Failed to load data:', err);
      this._updateLoadingStatus('Lỗi khi nạp dữ liệu, vui lòng thử lại...');
    }
  }


  _setupCrosshair() {
    this._chartManager.onCrosshairMove((param) => {
      if (!param || !param.point || !param.time || !param.seriesData) {
        this._tooltipPlugin.hide();
        return;
      }

      const dateStr = typeof param.time === 'string'
        ? param.time
        : (param.time.year
            ? `${param.time.year}-${String(param.time.month).padStart(2, '0')}-${String(param.time.day || 1).padStart(2, '0')}`
            : '');

      const hoveredValues = {};
      const allSeries = this._dataEngine.getAllSeries();

      for (const b of CENTRAL_BANKS) {
        const code = b.code;
        const series = this._chartManager._seriesMap.get(code);
        let val = undefined;

        if (series) {
          const point = param.seriesData.get(series);
          if (point && point.value !== undefined) {
            val = point.value;
          }
        }

        if (val === undefined && allSeries[code] && allSeries[code].data) {
          const arr = allSeries[code].data;
          for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i].time <= dateStr) {
              val = arr[i].value;
              break;
            }
          }
        }

        hoveredValues[code] = val;
      }

      this._tooltipPlugin.show(
        param.point.x,
        param.point.y,
        dateStr,
        hoveredValues,
        this._visibilityMap
      );
    });

    const chartWrap = document.getElementById('chart-wrap');
    chartWrap?.addEventListener('mouseleave', () => {
      this._tooltipPlugin.hide();
    });

    document.addEventListener('mouseleave', () => {
      this._tooltipPlugin.hide();
    });
  }

  _handleRangeChange(rangeId) {
    const rangeConfig = TIME_RANGES.find(r => r.id === rangeId);
    if (!rangeConfig || rangeConfig.isAll) {
      this._chartManager.fitContent();
      setTimeout(() => this._rightEndBadges?.updatePositions(), 50);
      return;
    }

    const today = new Date();
    let fromDate = new Date();

    if (rangeConfig.days) {
      fromDate.setDate(today.getDate() - rangeConfig.days);
    }

    const fromStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-01`;
    const toStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

    this._chartManager.setVisibleRange(fromStr, toStr);
    setTimeout(() => this._rightEndBadges?.updatePositions(), 50);
  }

  async _handleIndicatorChange(indicatorId) {
    try {
      const data = await this._dataEngine.loadIndicator(indicatorId);
      const seriesMap = this._dataEngine.getAllSeries();
      this._chartManager.setData(seriesMap);
      this._chartManager.fitContent();
      this._rightEndBadges.setSeriesData(seriesMap);
      this._toolbar.setRatesData(seriesMap);
      if (data.updated_at) this._toolbar.setUpdatedAt(data.updated_at);
      setTimeout(() => this._rightEndBadges?.updatePositions(), 80);
    } catch (err) {
      console.error('[App] Error switching indicator:', err);
    }
  }

  _handleToggleCountry(code, isVisible) {
    this._visibilityMap[code] = isVisible;
    this._chartManager.setSeriesVisible(code, isVisible);
    this._rightEndBadges.setVisibility(code, isVisible);
  }

  _handleToggleAll(isVisible) {
    for (const b of CENTRAL_BANKS) {
      this._visibilityMap[b.code] = isVisible;
      this._chartManager.setSeriesVisible(b.code, isVisible);
    }
    this._rightEndBadges.setAllVisibility(isVisible);
  }

  _handleApplySpread(codeA, codeB) {
    for (const b of CENTRAL_BANKS) {
      const isVis = (b.code === codeA || b.code === codeB);
      this._visibilityMap[b.code] = isVis;
      this._chartManager.setSeriesVisible(b.code, isVis);
      this._rightEndBadges.setVisibility(b.code, isVis);
    }
    this._chartManager.fitContent();
    setTimeout(() => this._rightEndBadges?.updatePositions(), 100);
  }

  _exportCsv() {
    const allSeries = this._dataEngine.getAllSeries();
    const indMeta = this._dataEngine.getIndicatorMeta();
    const codes = CENTRAL_BANKS.map(b => b.code);

    // Thu thập tất cả các mốc thời gian
    const timeSet = new Set();
    for (const code of codes) {
      const arr = allSeries[code]?.data || [];
      for (const pt of arr) timeSet.add(pt.time);
    }
    const sortedTimes = Array.from(timeSet).sort();

    // Dựng header CSV
    const header = ['Date', ...codes.map(c => `${c}_${allSeries[c]?.name || c}`)].join(',');
    const rows = [header];

    for (const t of sortedTimes) {
      const row = [t];
      for (const c of codes) {
        const pt = allSeries[c]?.data?.find(p => p.time === t);
        row.push(pt ? pt.value : '');
      }
      rows.push(row.join(','));
    }

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TradingIndex_${indMeta.id}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 100);
  }

  _exportPng() {
    const chart = this._chartManager?._chart;
    if (!chart) return;
    try {
      const canvas = chart.takeScreenshot();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const indMeta = this._dataEngine.getIndicatorMeta();
      const link = document.createElement('a');
      link.setAttribute('href', dataUrl);
      link.setAttribute('download', `TradingIndex_Chart_${indMeta.id}_${new Date().toISOString().slice(0, 10)}.png`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => link.remove(), 100);
    } catch (e) {
      console.error('[App] Export PNG error:', e);
    }
  }

  async _handleManualSync() {
    try {
      return await this._dataEngine.syncLatestRates();
    } catch (e) {
      console.error('[App] Manual sync error:', e);
      return { hasChanges: false, changedPoints: [] };
    }
  }

  _updateLoadingStatus(msg) {
    const statusEl = document.getElementById('ls-status-text');
    if (statusEl) statusEl.textContent = msg;
  }

  _hideLoadingScreen() {
    const ls = document.getElementById('loading-screen');
    if (ls) {
      ls.style.opacity = '0';
      ls.style.pointerEvents = 'none';
      setTimeout(() => ls.remove(), 400);
    }
  }
}

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(console.error);
});
