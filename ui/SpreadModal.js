/**
 * ui/SpreadModal.js — Modal Phân tích Chênh lệch (Spread / Rate Differential Mode)
 * Cho phép so sánh chênh lệch giữa 2 nền kinh tế bất kỳ (VD: US - JP, US - VN, EU - US).
 */

import { CENTRAL_BANKS } from '../config.js';

export class SpreadModal {
  /**
   * @param {Object} options
   * @param {import('../engine/RateDataEngine.js').RateDataEngine} options.dataEngine
   * @param {Function} options.onApplySpread
   */
  constructor({ dataEngine, onApplySpread }) {
    this._dataEngine = dataEngine;
    this._onApplySpread = onApplySpread;
    this._modalEl = null;
    this._codeA = 'US';
    this._codeB = 'JP';
    this._init();
  }

  _init() {
    const existing = document.getElementById('tv-spread-modal');
    if (existing) existing.remove();

    this._modalEl = document.createElement('div');
    this._modalEl.id = 'tv-spread-modal';
    this._modalEl.className = 'tv-modal-overlay';
    this._modalEl.style.display = 'none';

    document.body.appendChild(this._modalEl);
  }

  open() {
    this._render();
    this._modalEl.style.display = 'flex';
    requestAnimationFrame(() => this._modalEl.classList.add('tv-modal-visible'));
  }

  close() {
    this._modalEl.classList.remove('tv-modal-visible');
    setTimeout(() => {
      this._modalEl.style.display = 'none';
    }, 250);
  }

  _render() {
    const indMeta = this._dataEngine.getIndicatorMeta();
    const allSeries = this._dataEngine.getAllSeries();

    const optionsAHtml = CENTRAL_BANKS.map(b => `
      <option value="${b.code}" ${b.code === this._codeA ? 'selected' : ''}>
        ${b.code} - ${b.name} (${b.institution})
      </option>
    `).join('');

    const optionsBHtml = CENTRAL_BANKS.map(b => `
      <option value="${b.code}" ${b.code === this._codeB ? 'selected' : ''}>
        ${b.code} - ${b.name} (${b.institution})
      </option>
    `).join('');

    const sA = allSeries[this._codeA] || {};
    const sB = allSeries[this._codeB] || {};
    const valA = sA.current !== undefined ? Number(sA.current) : 0;
    const valB = sB.current !== undefined ? Number(sB.current) : 0;
    const spreadVal = (valA - valB).toFixed(2);
    const spreadSign = (valA - valB) >= 0 ? '+' : '';

    this._modalEl.innerHTML = `
      <div class="tv-modal-card">
        <div class="tv-modal-header">
          <div class="tv-modal-title">
            <span class="tv-modal-icon">⚖️</span>
            <span>Phân tích Chênh lệch (Spread Matrix) — ${indMeta.name}</span>
          </div>
          <button class="tv-modal-close" id="btn-close-spread" title="Đóng">✕</button>
        </div>

        <div class="tv-modal-body">
          <p class="tv-modal-desc">
            So sánh chênh lệch giữa hai nền kinh tế: <strong>Spread = [Quốc gia A] − [Quốc gia B]</strong>.
          </p>

          <div class="tv-spread-selectors">
            <div class="tv-spread-col">
              <label class="tv-spread-label">Quốc gia A (Gốc):</label>
              <select class="tv-spread-select" id="select-country-a">
                ${optionsAHtml}
              </select>
              <div class="tv-spread-stat">Hiện tại: <strong>${valA.toFixed(2)}%</strong></div>
            </div>

            <div class="tv-spread-operator">−</div>

            <div class="tv-spread-col">
              <label class="tv-spread-label">Quốc gia B (So sánh):</label>
              <select class="tv-spread-select" id="select-country-b">
                ${optionsBHtml}
              </select>
              <div class="tv-spread-stat">Hiện tại: <strong>${valB.toFixed(2)}%</strong></div>
            </div>
          </div>

          <div class="tv-spread-result-card">
            <div class="tv-spread-res-label">Chênh lệch Hiện tại (${this._codeA} − ${this._codeB}):</div>
            <div class="tv-spread-res-val ${Number(spreadVal) >= 0 ? 'pos' : 'neg'}">
              ${spreadSign}${spreadVal}%
            </div>
            <div class="tv-spread-res-sub">
              ${this._codeA} cao hơn ${this._codeB} ${Math.abs(Number(spreadVal))}% điểm phần trăm.
            </div>
          </div>
        </div>

        <div class="tv-modal-footer">
          <button class="tv-btn tv-btn-subtle" id="btn-cancel-spread">Đóng</button>
          <button class="tv-btn tv-btn-primary" id="btn-apply-spread">
            <span>🎯 Lọc hiển thị 2 quốc gia này</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-close-spread')?.addEventListener('click', () => this.close());
    document.getElementById('btn-cancel-spread')?.addEventListener('click', () => this.close());

    document.getElementById('select-country-a')?.addEventListener('change', (e) => {
      this._codeA = e.target.value;
      this._render();
    });

    document.getElementById('select-country-b')?.addEventListener('change', (e) => {
      this._codeB = e.target.value;
      this._render();
    });

    document.getElementById('btn-apply-spread')?.addEventListener('click', () => {
      this._onApplySpread?.(this._codeA, this._codeB);
      this.close();
    });
  }
}
