/**
 * ui/MacroMatrixModal.js — Modal Tổng quan Ma trận Kinh tế Vĩ mô 10 Nền kinh tế
 * Bảng tổng hợp đối chiếu 10 Quốc gia x 6 Chỉ số Vĩ mô với phân loại trực quan.
 */

import { CENTRAL_BANKS, INDICATORS } from '../config.js';

export class MacroMatrixModal {
  /**
   * @param {Object} options
   * @param {import('../engine/RateDataEngine.js').RateDataEngine} options.dataEngine
   */
  constructor({ dataEngine }) {
    this._dataEngine = dataEngine;
    this._modalEl = null;
    this._matrixData = {}; // indicatorId -> dataset object
    this._isLoading = false;
    this._init();
  }

  _init() {
    const existing = document.getElementById('tv-macro-matrix-modal');
    if (existing) existing.remove();

    this._modalEl = document.createElement('div');
    this._modalEl.id = 'tv-macro-matrix-modal';
    this._modalEl.className = 'tv-modal-overlay';
    this._modalEl.style.display = 'none';

    document.body.appendChild(this._modalEl);
  }

  async open() {
    this._modalEl.style.display = 'flex';
    requestAnimationFrame(() => this._modalEl.classList.add('tv-modal-visible'));
    await this._loadAllMatrixData();
    this._render();
  }

  close() {
    this._modalEl.classList.remove('tv-modal-visible');
    setTimeout(() => {
      this._modalEl.style.display = 'none';
    }, 250);
  }

  async _loadAllMatrixData() {
    this._isLoading = true;
    this._renderLoading();

    try {
      const promises = INDICATORS.map(async (ind) => {
        if (this._matrixData[ind.id]) return;
        try {
          const res = await fetch(`./data/${ind.file}?v=` + Date.now());
          if (res.ok) {
            this._matrixData[ind.id] = await res.json();
          }
        } catch (_) {}
      });

      await Promise.allSettled(promises);
    } finally {
      this._isLoading = false;
    }
  }

  _renderLoading() {
    this._modalEl.innerHTML = `
      <div class="tv-modal-card tv-modal-large">
        <div class="tv-modal-header">
          <div class="tv-modal-title">
            <span class="tv-modal-icon">🌐</span>
            <span>Ma Trận Kinh Tế Vĩ Mô Toàn Cầu (Macro Heatmap)</span>
          </div>
          <button class="tv-modal-close" id="btn-close-matrix">✕</button>
        </div>
        <div class="tv-modal-body" style="text-align: center; padding: 40px;">
          <div class="tv-loading-spinner"></div>
          <div style="margin-top: 16px; color: var(--tv-text-muted);">Đang tổng hợp dữ liệu 6 chỉ số vĩ mô của 10 quốc gia...</div>
        </div>
      </div>
    `;
    document.getElementById('btn-close-matrix')?.addEventListener('click', () => this.close());
  }

  _render() {
    const tableHeaderHtml = `
      <thead>
        <tr>
          <th>Quốc gia / Khu vực</th>
          ${INDICATORS.map(ind => `<th>${ind.icon} ${ind.shortName}</th>`).join('')}
        </tr>
      </thead>
    `;

    const tableRowsHtml = CENTRAL_BANKS.map(bank => {
      const cellsHtml = INDICATORS.map(ind => {
        const ds = this._matrixData[ind.id];
        const s = ds?.series?.[bank.code];
        const val = s?.current !== undefined ? Number(s.current).toFixed(2) : '--';
        const chg = s?.change !== undefined ? Number(s.change) : 0;
        const chgSign = chg > 0 ? '+' : '';
        const chgClass = chg > 0 ? 'text-pos' : (chg < 0 ? 'text-neg' : 'text-neutral');

        return `
          <td class="tv-matrix-cell">
            <div class="tv-matrix-val">${val}%</div>
            ${chg !== 0 ? `<div class="tv-matrix-chg ${chgClass}">${chgSign}${chg.toFixed(2)}%</div>` : ''}
          </td>
        `;
      }).join('');

      return `
        <tr>
          <td class="tv-matrix-country">
            <img src="${bank.flagIcon}" class="tv-matrix-flag" alt="${bank.code}" />
            <div class="tv-matrix-c-info">
              <span class="tv-matrix-c-name">${bank.name}</span>
              <span class="tv-matrix-c-inst">${bank.institution}</span>
            </div>
          </td>
          ${cellsHtml}
        </tr>
      `;
    }).join('');

    this._modalEl.innerHTML = `
      <div class="tv-modal-card tv-modal-large">
        <div class="tv-modal-header">
          <div class="tv-modal-title">
            <span class="tv-modal-icon">🌐</span>
            <span>Ma Trận Kinh Tế Vĩ Mô Toàn Cầu (Macro Heatmap)</span>
          </div>
          <button class="tv-modal-close" id="btn-close-matrix" title="Đóng">✕</button>
        </div>

        <div class="tv-modal-body">
          <div class="tv-matrix-table-wrap">
            <table class="tv-matrix-table">
              ${tableHeaderHtml}
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <div class="tv-modal-footer">
          <div class="tv-matrix-note">💡 Dữ liệu tháng mới nhất từ BIS, SBV, FRED, World Bank & TradingView.</div>
          <button class="tv-btn tv-btn-subtle" id="btn-cancel-matrix">Đóng</button>
        </div>
      </div>
    `;

    document.getElementById('btn-close-matrix')?.addEventListener('click', () => this.close());
    document.getElementById('btn-cancel-matrix')?.addEventListener('click', () => this.close());
  }
}
