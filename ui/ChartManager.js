/**
 * ui/ChartManager.js — Biểu đồ So sánh Lãi suất Đa quốc gia (TradingView Lightweight Charts v5)
 * Hỗ trợ đường bậc thang (Stepped Line), Theme Sáng/Tối linh hoạt, bật/tắt từng quốc gia.
 * Nến cuối cách thang giá 30 cây nến khi Auto-fit.
 */

import { createChart, LineSeries, LineType } from 'https://cdn.jsdelivr.net/npm/lightweight-charts@5.0.7/+esm';
import { CENTRAL_BANKS, THEMES } from '../config.js';

export class ChartManager {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this._container = container;
    this._chart = null;
    this._seriesMap = new Map(); // code -> ISeriesApi
    this._visibilityMap = new Map(); // code -> boolean
    this._currentTheme = 'light';
    this._crosshairCallbacks = new Set();
    this._isInit = false;
  }

  get container() { return this._container; }

  /**
   * Khởi tạo biểu đồ Lightweight Charts
   */
  init(themeName = 'light') {
    this._currentTheme = themeName;
    const theme = THEMES[themeName] || THEMES.light;
    const isDark = themeName === 'dark';

    this._chart = createChart(this._container, {
      layout: {
        background: { color: theme.bg },
        textColor: theme.text,
        fontSize: 12,
        fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: {
          visible: false,
        },
        horzLines: {
          visible: false,
        },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: theme.crosshair,
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(241, 245, 249, 0.95)',
        },
        horzLine: {
          color: theme.crosshair,
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(241, 245, 249, 0.95)',
        },
      },
      rightPriceScale: {
        visible: true,
        borderColor: theme.border,
        textColor: theme.text,
        autoScale: true,
        alignLabels: true,
        entireTextOnly: true,
        scaleMargins: {
          top: 0.08,
          bottom: 0.08,
        },
      },
      timeScale: {
        visible: true,
        borderColor: theme.border,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
        rightOffset: 20, // Nến cuối cách thang giá 20 cây nến cho nhãn cờ
        barSpacing: 8,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // Tạo các line series dạng bậc thang cho 10 Central Banks
    for (const bank of CENTRAL_BANKS) {
      const series = this._chart.addSeries(LineSeries, {
        color: bank.color,
        lineWidth: bank.lineWidth || 2.5,
        lineType: LineType.WithSteps, // Đường bậc thang chuẩn lãi suất TradingView
        priceFormat: {
          type: 'custom',
          formatter: (price) => `${price.toFixed(2)}%`,
          minMove: 0.01,
        },
        title: '', // Tắt title mặc định trên canvas
        lastValueVisible: false, // Ẩn badge thô sơ, thay bằng RightEndBadges SVG Flags tuyệt đẹp
        priceLineVisible: false, // Xóa các đường nét đứt ngang
      });

      this._seriesMap.set(bank.code, series);
      this._visibilityMap.set(bank.code, bank.defaultVisible !== false);
    }

    // Lắng nghe sự kiện di chuột Crosshair
    this._chart.subscribeCrosshairMove((param) => {
      for (const cb of this._crosshairCallbacks) {
        try {
          cb(param);
        } catch (e) {
          console.error('[ChartManager] Crosshair callback error:', e);
        }
      }
    });

    // Tự động resize theo container
    this._resizeObserver = new ResizeObserver(() => {
      if (this._chart && this._container) {
        const { clientWidth, clientHeight } = this._container;
        if (clientWidth > 0 && clientHeight > 0) {
          this._chart.resize(clientWidth, clientHeight);
        }
      }
    });
    this._resizeObserver.observe(this._container);

    this._isInit = true;
    return this;
  }

  onCrosshairMove(cb) {
    this._crosshairCallbacks.add(cb);
    return () => this._crosshairCallbacks.delete(cb);
  }

  setData(seriesDataMap) {
    if (!this._chart) return;

    for (const [code, seriesObj] of Object.entries(seriesDataMap)) {
      const series = this._seriesMap.get(code);
      if (series && Array.isArray(seriesObj.data)) {
        // Data từ generate script đã được sorted; sort lại chỉ khi thực sự cần
        series.setData(seriesObj.data);
      }
    }
  }

  /**
   * Cập nhật hoặc thêm một điểm dữ liệu duy nhất cho một series.
   * Dùng khi sync — hiệu quả hơn setData() nhiều vì chỉ update 1 điểm.
   * @param {string} code — Mã quốc gia (VD: 'US', 'VN')
   * @param {{ time: string, value: number }} point — Điểm cần update
   */
  updatePoint(code, point) {
    if (!this._chart) return;
    const series = this._seriesMap.get(code);
    if (series && point) {
      series.update(point); // Lightweight Charts: update/append 1 điểm
    }
  }

  setSeriesVisible(code, isVisible) {
    const series = this._seriesMap.get(code);
    if (series) {
      series.applyOptions({
        visible: isVisible,
      });
      this._visibilityMap.set(code, isVisible);
    }
  }

  isSeriesVisible(code) {
    return this._visibilityMap.get(code) ?? true;
  }

  setTheme(themeName) {
    if (!this._chart) return;
    this._currentTheme = themeName;
    const theme = THEMES[themeName] || THEMES.light;
    const isDark = themeName === 'dark';

    this._chart.applyOptions({
      layout: {
        background: { color: theme.bg },
        textColor: theme.text,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        vertLine: {
          color: theme.crosshair,
          labelBackgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(241, 245, 249, 0.95)',
        },
        horzLine: {
          color: theme.crosshair,
          labelBackgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(241, 245, 249, 0.95)',
        },
      },
      rightPriceScale: {
        borderColor: theme.border,
        textColor: theme.text,
      },
      timeScale: {
        borderColor: theme.border,
      },
    });
  }

  fitContent() {
    if (this._chart) {
      const timeScale = this._chart.timeScale();
      timeScale.applyOptions({
        rightOffset: 18,
        barSpacing: 9, // Zoom to rộng rãi, dễ nhìn hơn
        minBarSpacing: 0.5,
      });
      timeScale.scrollToRealTime();
    }
  }

  setVisibleRange(fromTime, toTime) {
    if (this._chart) {
      try {
        this._chart.timeScale().applyOptions({
          rightOffset: 20,
        });
        this._chart.timeScale().setVisibleRange({
          from: fromTime,
          to: toTime,
        });
      } catch (e) {
        console.warn('[ChartManager] setVisibleRange fallback to fitContent:', e);
        this.fitContent();
      }
    }
  }

  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this._chart) {
      this._chart.remove();
      this._chart = null;
    }
    this._seriesMap.clear();
    this._crosshairCallbacks.clear();
  }
}
