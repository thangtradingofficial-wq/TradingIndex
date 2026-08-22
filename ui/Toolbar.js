/**
 * ui/Toolbar.js — Thanh công cụ: Header Ngang chọn 6 Chỉ số Vĩ mô + Dock Dọc trôi nổi chọn 10 Quốc kỳ
 */

import { CENTRAL_BANKS, TIME_RANGES, CURRENT_TIMEFRAME, INDICATORS } from '../config.js';

export class Toolbar {
  constructor({
    onIndicatorChange,
    onRangeChange,
    onThemeToggle,
    onAutoFit,
    onSyncNow,
    onToggleCountry,
    onToggleAll,
    onOpenSpread,
    onOpenMatrix,
    onExportCsv,
    onExportPng,
  }) {
    this._onIndicatorChange = onIndicatorChange;
    this._onRangeChange = onRangeChange;
    this._onThemeToggle = onThemeToggle;
    this._onAutoFit = onAutoFit;
    this._onSyncNow = onSyncNow;
    this._onToggleCountry = onToggleCountry;
    this._onToggleAll = onToggleAll;
    this._onOpenSpread = onOpenSpread;
    this._onOpenMatrix = onOpenMatrix;
    this._onExportCsv = onExportCsv;
    this._onExportPng = onExportPng;

    this._topBarEl = document.getElementById('top-bar');
    this._flagDockEl = document.getElementById('left-flag-dock');
    this._bottomBarEl = document.getElementById('tv-bottom-bar');
    this._currentIndicator = 'policy_rates';
    this._currentRange = 'ALL';
    this._currentTheme = 'light';
    this._visibility = {};
    this._seriesData = {};
    this._clockTimer = null;

    for (const b of CENTRAL_BANKS) {
      this._visibility[b.code] = b.defaultVisible !== false;
    }
  }

  init(currentTheme = 'light', currentIndicator = 'policy_rates') {
    this._currentTheme = currentTheme;
    this._currentIndicator = currentIndicator;
    this._renderTopBar();
    this._renderLeftFlagDock();
    this._renderBottomBar();
    this._startClock();
  }

  setIndicator(indicatorId) {
    this._currentIndicator = indicatorId;

    const tabs = this._topBarEl?.querySelectorAll('.tv-ind-tab');
    tabs?.forEach(t => {
      if (t.getAttribute('data-indicator') === indicatorId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    const meta = INDICATORS.find(i => i.id === indicatorId) || INDICATORS[0];
    const brandTitleEl = document.getElementById('tv-brand-title');
    if (brandTitleEl) brandTitleEl.textContent = meta.name;
  }

  setRatesData(dataMap) {
    this._seriesData = dataMap || {};
    this._updateFlagPills();
  }

  setUpdatedAt(isoStr) {
    if (!isoStr) return;
    const el = document.getElementById('tv-updated-at');
    if (!el) return;
    try {
      const d = new Date(isoStr);
      const formatted = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        hour12: false,
      }).format(d);
      el.textContent = `Dữ liệu: ${formatted}`;
      el.title = `Cập nhật lần cuối: ${isoStr}`;
    } catch (_) {}
  }

  _showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `tv-toast tv-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('tv-toast-visible'));
    });

    setTimeout(() => {
      toast.classList.remove('tv-toast-visible');
      setTimeout(() => toast.remove(), 350);
    }, 3000);
  }

  /**
   * 1. Render Thanh Ngang Header (TopBar) chứa 6 Chỉ số Vĩ mô
   */
  _renderTopBar() {
    if (!this._topBarEl) return;

    const currentMeta = INDICATORS.find(i => i.id === this._currentIndicator) || INDICATORS[0];

    const indTabsHtml = INDICATORS.map(ind => `
      <button class="tv-ind-tab ${ind.id === this._currentIndicator ? 'active' : ''}" 
              data-indicator="${ind.id}" 
              title="${ind.description}">
        <span class="tv-ind-icon">${ind.icon}</span>
        <span class="tv-ind-label">${ind.name}</span>
      </button>
    `).join('');

    this._topBarEl.innerHTML = `
      <div class="tv-tb-left">
        <div class="tv-brand">
          <svg class="tv-logo-svg" viewBox="0 0 36 28" width="20" height="15" fill="currentColor">
            <path d="M14 22H7V11H14V22ZM21 22H14V6H21V22ZM28 22H21V0H28V22Z"/>
          </svg>
          <span class="tv-brand-name" id="tv-brand-title">${currentMeta.name}</span>
          <span class="tv-timeframe-badge" title="Độ phân giải: 1 Tháng / điểm dữ liệu">${CURRENT_TIMEFRAME || '1M'}</span>
        </div>

        <div class="tv-tb-divider"></div>

        <!-- Bộ chọn 6 Chỉ số Vĩ mô ngang -->
        <nav class="tv-indicator-dock" id="tv-indicator-dock">
          ${indTabsHtml}
        </nav>
      </div>

      <div class="tv-tb-right">
        <button class="tv-btn tv-btn-subtle" id="btn-open-spread" title="Phân tích Chênh lệch Lãi suất giữa 2 Quốc gia (Spread)">
          <span class="tv-icon">⚖️</span>
          <span>Chênh lệch</span>
        </button>

        <button class="tv-btn tv-btn-subtle" id="btn-open-matrix" title="Tổng quan Ma trận 10 Quốc gia x 6 Chỉ số Vĩ mô">
          <span class="tv-icon">🌐</span>
          <span>Ma trận</span>
        </button>

        <button class="tv-btn tv-btn-subtle" id="btn-export-csv" title="Tải xuống tập dữ liệu lịch sử CSV (1990 - nay)">
          <span class="tv-icon">📥</span>
          <span>CSV</span>
        </button>

        <button class="tv-btn tv-btn-subtle" id="btn-export-png" title="Chụp ảnh biểu đồ sắc nét (PNG Snapshot)">
          <span class="tv-icon">📷</span>
          <span>Ảnh</span>
        </button>

        <button class="tv-btn tv-btn-subtle" id="btn-sync-now" title="Đồng bộ dữ liệu thời gian thực từ TradingView">
          <span class="tv-icon" id="sync-icon">🔄</span>
          <span id="sync-text">Cập nhật</span>
        </button>

        <button class="tv-theme-toggle-btn" id="btn-theme-toggle" title="Chuyển chế độ Sáng / Tối">
          <span class="theme-icon">${this._currentTheme === 'dark' ? '☀️' : '🌙'}</span>
          <span class="theme-label">${this._currentTheme === 'dark' ? 'Sáng' : 'Tối'}</span>
        </button>

        <button class="tv-btn tv-btn-primary" id="btn-auto-fit-top" title="Căn chỉnh vừa khung hình biểu đồ">
          <span>Auto-fit</span>
        </button>
      </div>
    `;

    // Indicator tabs click events
    const indTabs = this._topBarEl.querySelectorAll('.tv-ind-tab');
    indTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const indId = tab.getAttribute('data-indicator');
        if (!indId || indId === this._currentIndicator) return;
        this.setIndicator(indId);
        this._onIndicatorChange?.(indId);
      });
    });

    // Spread modal button
    document.getElementById('btn-open-spread')?.addEventListener('click', () => {
      this._onOpenSpread?.();
    });

    // Macro Matrix modal button
    document.getElementById('btn-open-matrix')?.addEventListener('click', () => {
      this._onOpenMatrix?.();
    });

    // Export CSV button
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      this._onExportCsv?.();
    });

    // Export PNG button
    document.getElementById('btn-export-png')?.addEventListener('click', () => {
      this._onExportPng?.();
    });

    // Sync button
    document.getElementById('btn-sync-now')?.addEventListener('click', () => {
      const btn = document.getElementById('btn-sync-now');
      const icon = document.getElementById('sync-icon');
      const text = document.getElementById('sync-text');
      if (btn) btn.disabled = true;
      if (icon) icon.classList.add('spin-anim');
      if (text) text.textContent = 'Đang đồng bộ...';

      this._onSyncNow?.()
        ?.then(res => {
          if (res?.hasChanges && res?.changedPoints?.length > 0) {
            this._showToast(`✓ Đã cập nhật ${res.changedPoints.length} quốc gia mới!`, 'success');
          } else {
            this._showToast('Dữ liệu đã ở trạng thái mới nhất.', 'info');
          }
        })
        ?.catch(err => {
          console.error('[Toolbar] Sync error:', err);
          this._showToast('Lỗi khi đồng bộ dữ liệu: ' + err.message, 'error');
        })
        ?.finally(() => {
          setTimeout(() => {
            if (icon) icon.classList.remove('spin-anim');
            if (text) text.textContent = 'Cập nhật';
            if (btn) btn.disabled = false;
          }, 600);
        });
    });

    // Theme toggle button
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      const newTheme = this._currentTheme === 'dark' ? 'light' : 'dark';
      this._currentTheme = newTheme;
      this._updateThemeButton();
      this._onThemeToggle?.(newTheme);
    });

    // Auto-fit top button
    document.getElementById('btn-auto-fit-top')?.addEventListener('click', () => {
      this._onAutoFit?.();
    });
  }

  /**
   * 2. Render Dock Dọc Trôi Nổi (Floating Left Country Dock) cho 10 Quốc kỳ SVG
   * Hoàn toàn không có nền khung bao quanh (zero container background)
   */
  _renderLeftFlagDock() {
    if (!this._flagDockEl) return;

    const flagPillsHtml = CENTRAL_BANKS.map(b => {
      const isChecked = this._visibility[b.code] !== false;
      const s = this._seriesData[b.code] || {};
      const rateVal = s.current !== undefined ? `${Number(s.current).toFixed(2)}%` : '';

      return `
        <button class="tv-flag-pill ${isChecked ? 'active' : 'inactive'}" 
                data-code="${b.code}" 
                title="${isChecked ? 'Bấm để ẩn' : 'Bấm để hiện'} ${b.name} (${b.institution})"
                style="--line-c: ${b.color};">
          <img src="${b.flagIcon}" class="tv-flag-icon" alt="${b.code}" />
          <span class="tv-flag-name">${b.code}</span>
          <span class="tv-flag-rate" id="flag-rate-${b.code}">${rateVal}</span>
        </button>
      `;
    }).join('');

    this._flagDockEl.innerHTML = `
      <div class="tv-flags-stack">
        ${flagPillsHtml}
        <button class="tv-flag-pill tv-flag-all-btn" id="btn-toggle-all-dock" title="Bật/Tắt tất cả 10 quốc gia">
          <span class="tv-flag-all-icon">🌐</span>
          <span class="tv-flag-name">Tất cả</span>
        </button>
      </div>
    `;

    // Flag toggle events
    const pills = this._flagDockEl.querySelectorAll('.tv-flag-pill:not(#btn-toggle-all-dock)');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const code = pill.getAttribute('data-code');
        const currentVis = this._visibility[code] !== false;
        const newVis = !currentVis;
        this._visibility[code] = newVis;

        if (newVis) {
          pill.classList.remove('inactive');
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
          pill.classList.add('inactive');
        }

        this._onToggleCountry?.(code, newVis);
      });
    });

    // Toggle all button
    document.getElementById('btn-toggle-all-dock')?.addEventListener('click', () => {
      const anyInactive = CENTRAL_BANKS.some(b => this._visibility[b.code] === false);
      const newVis = anyInactive;

      for (const b of CENTRAL_BANKS) {
        this._visibility[b.code] = newVis;
      }

      pills.forEach(pill => {
        if (newVis) {
          pill.classList.remove('inactive');
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
          pill.classList.add('inactive');
        }
      });

      this._onToggleAll?.(newVis);
    });
  }

  _updateFlagPills() {
    for (const b of CENTRAL_BANKS) {
      const el = document.getElementById(`flag-rate-${b.code}`);
      if (!el) continue;
      const s = this._seriesData[b.code];
      if (s && s.current !== undefined) {
        el.textContent = `${Number(s.current).toFixed(2)}%`;
      } else {
        el.textContent = '--%';
      }
    }
  }

  /**
   * 3. Render Bottom Bar
   */
  _renderBottomBar() {
    if (!this._bottomBarEl) return;

    const rangeBtnsHtml = TIME_RANGES.map(r => `
      <button class="tv-range-btn ${r.id === this._currentRange ? 'active' : ''}" 
              data-range="${r.id}" 
              title="Xem ${r.label}">
        ${r.id}
      </button>
    `).join('');

    this._bottomBarEl.innerHTML = `
      <div class="tv-bb-left">
        <div class="tv-brand-mini">
          <svg class="tv-logo-svg" viewBox="0 0 36 28" width="18" height="14" fill="currentColor">
            <path d="M14 22H7V11H14V22ZM21 22H14V6H21V22ZM28 22H21V0H28V22Z"/>
          </svg>
          <span class="tv-logo-name">TradingView</span>
        </div>
        <div class="tv-range-pills" id="tv-range-pills">
          ${rangeBtnsHtml}
        </div>
      </div>

      <div class="tv-bb-right">
        <span class="tv-updated-at" id="tv-updated-at" title="Thời điểm cập nhật dữ liệu lần cuối"></span>
        <div class="tv-clock-wrap">
          <span class="tv-clock-dot"></span>
          <span class="tv-clock-text" id="tv-clock">00:00:00 (UTC+7)</span>
        </div>
        <div class="tv-scale-toggles">
          <button class="tv-scale-btn active" id="tv-auto-fit-btn" title="Tự động căn chỉnh vừa biểu đồ">auto</button>
        </div>
      </div>
    `;

    const pills = this._bottomBarEl.querySelectorAll('.tv-range-btn');
    pills.forEach(btn => {
      btn.addEventListener('click', () => {
        const rangeId = btn.getAttribute('data-range');
        if (!rangeId) return;

        pills.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._currentRange = rangeId;
        this._onRangeChange?.(rangeId);
      });
    });

    document.getElementById('tv-auto-fit-btn')?.addEventListener('click', () => {
      this._onAutoFit?.();
    });
  }

  _updateThemeButton() {
    const btn = document.getElementById('btn-theme-toggle');
    if (!btn) return;
    btn.innerHTML = `
      <span class="theme-icon">${this._currentTheme === 'dark' ? '☀️' : '🌙'}</span>
      <span class="theme-label">${this._currentTheme === 'dark' ? 'Sáng' : 'Tối'}</span>
    `;
  }

  _startClock() {
    const update = () => {
      const el = document.getElementById('tv-clock');
      if (!el) return;
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).format(now);
      el.textContent = `${timeStr} (UTC+7)`;
    };
    update();
    if (this._clockTimer) clearInterval(this._clockTimer);
    this._clockTimer = setInterval(update, 1000);
  }
}
