/**
 * ui/TooltipPlugin.js — Tooltip nổi tương tác động theo vị trí con trỏ chuột (Crosshair)
 * Hiển thị chính xác ngày và tất cả số liệu lãi suất 10 NHTW ngay tại tọa độ chuột rê vào.
 * Ẩn ngay lập tức khi chuột rời khỏi biểu đồ.
 *
 * Tối ưu: Pre-create DOM elements một lần duy nhất trong _init().
 * Khi hover, chỉ update textContent — không rebuild innerHTML mỗi mousemove.
 * Giảm từ ~3600 innerHTML assignments/phút xuống 0 DOM rebuild.
 */

import { CENTRAL_BANKS } from '../config.js';

export class TooltipPlugin {
  /**
   * @param {HTMLElement} container — DOM container của chart
   */
  constructor(container) {
    this._container = container;
    this._tooltipEl = null;
    this._dateEl = null;
    this._rows = new Map(); // code → { rowEl, valEl }
    this._init();
  }

  _init() {
    // ── Outer tooltip container ──────────────────────────────────────────────
    this._tooltipEl = document.createElement('div');
    this._tooltipEl.className = 'tv-cursor-tooltip';
    this._tooltipEl.style.display = 'none';

    // ── Header: icon + ngày ─────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'tv-ct-header';

    const dateIcon = document.createElement('span');
    dateIcon.className = 'tv-ct-date-icon';
    dateIcon.textContent = '📅';

    this._dateEl = document.createElement('span');
    this._dateEl.className = 'tv-ct-date-text';

    header.appendChild(dateIcon);
    header.appendChild(this._dateEl);

    // ── List: 1 row cho mỗi central bank ────────────────────────────────────
    const listEl = document.createElement('div');
    listEl.className = 'tv-ct-list';

    for (const b of CENTRAL_BANKS) {
      const rowEl = document.createElement('div');
      rowEl.className = 'tv-ct-row';
      rowEl.style.setProperty('--c-dot', b.color);

      const leftEl = document.createElement('div');
      leftEl.className = 'tv-ct-left';

      const dotEl = document.createElement('span');
      dotEl.className = 'tv-ct-dot';
      dotEl.style.backgroundColor = b.color;

      const flagEl = document.createElement('img');
      flagEl.src = b.flagIcon;
      flagEl.className = 'tv-ct-flag-img';
      flagEl.alt = b.code;

      const tickerEl = document.createElement('span');
      tickerEl.className = 'tv-ct-ticker';
      tickerEl.style.color = b.color;
      tickerEl.style.fontWeight = '700';
      tickerEl.textContent = b.ticker;

      const nameEl = document.createElement('span');
      nameEl.className = 'tv-ct-name';
      nameEl.textContent = b.name;

      leftEl.appendChild(dotEl);
      leftEl.appendChild(flagEl);
      leftEl.appendChild(tickerEl);
      leftEl.appendChild(nameEl);

      const valEl = document.createElement('span');
      valEl.className = 'tv-ct-val';
      valEl.style.color = b.color;
      valEl.style.fontWeight = '700';

      rowEl.appendChild(leftEl);
      rowEl.appendChild(valEl);
      listEl.appendChild(rowEl);

      this._rows.set(b.code, { rowEl, valEl });
    }

    this._tooltipEl.appendChild(header);
    this._tooltipEl.appendChild(listEl);
    this._container.appendChild(this._tooltipEl);
  }

  /**
   * Cập nhật vị trí và nội dung tooltip theo tọa độ chuột và dữ liệu ngày.
   * Chỉ update textContent — không rebuild DOM.
   * @param {number} x — Tọa độ pixel X
   * @param {number} y — Tọa độ pixel Y
   * @param {string} dateStr — Ngày (YYYY-MM-DD)
   * @param {Object} valuesMap — { [code]: rateValue }
   * @param {Object} visibilityMap — { [code]: boolean }
   */
  show(x, y, dateStr, valuesMap, visibilityMap) {
    if (!this._tooltipEl || !dateStr) return;

    // Kiểm tra có ít nhất 1 quốc gia đang hiển thị
    const visibleCount = CENTRAL_BANKS.filter(b => visibilityMap[b.code] !== false).length;
    if (visibleCount === 0) { this.hide(); return; }

    // Cập nhật ngày — chỉ ghi nếu thay đổi
    if (this._dateEl.textContent !== dateStr) {
      this._dateEl.textContent = dateStr;
    }

    // Cập nhật từng row: show/hide + giá trị
    for (const b of CENTRAL_BANKS) {
      const row = this._rows.get(b.code);
      if (!row) continue;

      const isVisible = visibilityMap[b.code] !== false;
      row.rowEl.style.display = isVisible ? '' : 'none';

      if (isVisible) {
        const val = valuesMap[b.code];
        const formatted = (val !== undefined && val !== null)
          ? `${Number(val).toFixed(2)}%`
          : '--';
        if (row.valEl.textContent !== formatted) {
          row.valEl.textContent = formatted;
        }
      }
    }

    // ── Tính vị trí tooltip tránh tràn viền ────────────────────────────────
    const rect = this._container.getBoundingClientRect();
    const tooltipWidth = 270;
    const tooltipHeight = Math.min(visibleCount * 27 + 45, 360);
    const offsetX = 18;
    const offsetY = 18;

    let left = x + offsetX;
    let top = y + offsetY;

    if (left + tooltipWidth > rect.width)  left = x - tooltipWidth - offsetX;
    if (top + tooltipHeight > rect.height) top = Math.max(10, rect.height - tooltipHeight - 10);
    if (left < 10) left = 10;
    if (top < 10)  top = 10;

    this._tooltipEl.style.left = `${Math.round(left)}px`;
    this._tooltipEl.style.top  = `${Math.round(top)}px`;
    this._tooltipEl.style.display = 'block';
  }

  hide() {
    if (this._tooltipEl) {
      this._tooltipEl.style.display = 'none';
    }
  }

  destroy() {
    if (this._tooltipEl) {
      this._tooltipEl.remove();
      this._tooltipEl = null;
    }
    this._rows.clear();
  }
}
