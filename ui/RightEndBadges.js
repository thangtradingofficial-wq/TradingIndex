/**
 * ui/RightEndBadges.js — Nhãn giá cuối đường & Dấu chấm nhấp nháy phát quang tại điểm cuối
 * Điểm cuối có dấu chấm nhấp nháy phát quang cùng màu với đường nét vẽ (Pulsing End Dot).
 * Nhãn giá luôn cách nến cuối cùng 10 cây nến theo phương ngang (X), tự động chống đè nhãn theo phương dọc (Y).
 */

import { CENTRAL_BANKS } from '../config.js';

export class RightEndBadges {
  /**
   * @param {HTMLElement} container — DOM overlay container
   * @param {import('./ChartManager.js').ChartManager} chartManager
   */
  constructor(container, chartManager) {
    this._container = container;
    this._chartManager = chartManager;
    this._badges = new Map(); // code -> HTMLElement
    this._dots = new Map(); // code -> HTMLElement (Pulsing End Dots)
    this._latestData = new Map(); // code -> { time, value }
    this._visibility = {};
    this._timeRangeUnsubscribe = null;
    this._resizeObserver = null;
    this._init();
  }

  _init() {
    // 1. Layer chứa các dấu chấm nhấp nháy ở điểm cuối của từng đường
    this._dotWrap = document.createElement('div');
    this._dotWrap.className = 'tv-end-dots-wrap';
    this._container.appendChild(this._dotWrap);

    // 2. Layer chứa các nhãn giá gắn cờ bên trục phải
    this._badgeWrap = document.createElement('div');
    this._badgeWrap.className = 'tv-end-badges-wrap';
    this._container.appendChild(this._badgeWrap);

    for (const b of CENTRAL_BANKS) {
      this._visibility[b.code] = b.defaultVisible !== false;

      // Tạo dấu chấm nhấp nháy (Pulsing Dot)
      const dot = document.createElement('div');
      dot.className = 'tv-end-pulse-dot';
      dot.setAttribute('data-code', b.code);
      dot.style.setProperty('--dot-color', b.color);
      this._dotWrap.appendChild(dot);
      this._dots.set(b.code, dot);

      // Tạo nhãn giá gắn cờ (Right End Badge)
      const badge = document.createElement('div');
      badge.className = 'tv-end-badge';
      badge.setAttribute('data-code', b.code);
      badge.style.setProperty('--b-color', b.color);
      badge.innerHTML = `
        <img src="${b.flagIcon}" class="tv-eb-flag" alt="${b.name}" />
        <span class="tv-eb-name">${b.code} · ${b.name}</span>
        <span class="tv-eb-val">--%</span>
      `;
      this._badgeWrap.appendChild(badge);
      this._badges.set(b.code, badge);
    }

    this._startUpdateLoop();
  }

  setSeriesData(dataMap) {
    if (!dataMap) return;

    for (const b of CENTRAL_BANKS) {
      const s = dataMap[b.code];
      if (s && s.data && s.data.length > 0) {
        const lastPt = s.data[s.data.length - 1];
        this._latestData.set(b.code, lastPt);

        const badge = this._badges.get(b.code);
        if (badge) {
          const valEl = badge.querySelector('.tv-eb-val');
          if (valEl) valEl.textContent = `${Number(lastPt.value).toFixed(2)}%`;
        }
      }
    }

    this.updatePositions();
  }

  setVisibility(code, isVisible) {
    this._visibility[code] = isVisible;
    const badge = this._badges.get(code);
    if (badge) {
      badge.style.display = isVisible ? 'flex' : 'none';
    }
    const dot = this._dots.get(code);
    if (dot) {
      dot.style.display = isVisible ? 'block' : 'none';
    }
    this.updatePositions();
  }

  setAllVisibility(isVisible) {
    for (const b of CENTRAL_BANKS) {
      this._visibility[b.code] = isVisible;
      const badge = this._badges.get(b.code);
      if (badge) {
        badge.style.display = isVisible ? 'flex' : 'none';
      }
      const dot = this._dots.get(b.code);
      if (dot) {
        dot.style.display = isVisible ? 'block' : 'none';
      }
    }
    this.updatePositions();
  }

  updatePositions() {
    if (!this._chartManager || !this._chartManager._chart) return;

    const chart = this._chartManager._chart;
    const timeScale = chart.timeScale();
    const activeBadges = [];

    // Tìm mốc thời gian của nến cuối cùng
    let lastPointTime = null;
    for (const b of CENTRAL_BANKS) {
      const dataPt = this._latestData.get(b.code);
      if (dataPt && (!lastPointTime || dataPt.time > lastPointTime)) {
        lastPointTime = dataPt.time;
      }
    }

    // Tính tọa độ X cho nhãn: Luôn cách nến cuối đúng 10 cây nến (10 bars offset)
    let targetX = null;
    if (lastPointTime) {
      const lastX = timeScale.timeToCoordinate(lastPointTime);
      if (lastX !== null && lastX !== undefined && !isNaN(lastX)) {
        let barSpacing = 8;
        try {
          barSpacing = timeScale.options().barSpacing || 8;
        } catch (_) {}
        targetX = lastX + 10 * barSpacing;
      }
    }

    const containerWidth = this._container.clientWidth || 800;

    for (const b of CENTRAL_BANKS) {
      const isVisible = this._visibility[b.code] !== false;
      const badge = this._badges.get(b.code);
      const dot = this._dots.get(b.code);
      if (!isVisible) {
        if (badge) badge.style.display = 'none';
        if (dot) dot.style.display = 'none';
        continue;
      }

      const series = this._chartManager._seriesMap.get(b.code);
      const dataPt = this._latestData.get(b.code);
      if (!series || !dataPt) continue;

      const yCoord = series.priceToCoordinate(dataPt.value);
      const lastX = timeScale.timeToCoordinate(dataPt.time);

      if (yCoord === null || yCoord === undefined || isNaN(yCoord) || lastX === null || lastX === undefined || isNaN(lastX)) {
        if (badge) badge.style.display = 'none';
        if (dot) dot.style.display = 'none';
        continue;
      }

      // Nếu điểm cuối bị cuộn quá xa ngoài màn hình bên trái
      if (lastX < -50) {
        if (badge) badge.style.display = 'none';
        if (dot) dot.style.display = 'none';
        continue;
      }

      // 1. Cập nhật vị trí dấu chấm nhấp nháy phát quang tại điểm cuối chính xác của đường
      if (dot) {
        dot.style.display = 'block';
        dot.style.transform = `translate3d(${lastX - 4.5}px, ${yCoord - 4.5}px, 0)`;
      }

      // 2. Thu thập nhãn để giải quyết va chạm (collision avoidance)
      if (badge) {
        badge.style.display = 'flex';
        activeBadges.push({
          code: b.code,
          element: badge,
          targetY: yCoord,
          value: dataPt.value,
          currentY: yCoord,
        });
      }
    }

    if (activeBadges.length === 0) return;

    // Sắp xếp theo trục Y để chống đè chữ (Collision Avoidance)
    activeBadges.sort((a, b) => a.targetY - b.targetY);

    const badgeHeight = 28;
    const minSpacing = 4;
    const itemFullHeight = badgeHeight + minSpacing;
    const containerHeight = this._container.clientHeight || 500;
    const maxAllowedY = containerHeight - badgeHeight / 2 - 8;
    const minAllowedY = badgeHeight / 2 + 8;

    // 1. Forward pass: Đẩy dồn xuống dưới
    for (let i = 1; i < activeBadges.length; i++) {
      const prev = activeBadges[i - 1];
      const curr = activeBadges[i];
      if (curr.currentY < prev.currentY + itemFullHeight) {
        curr.currentY = prev.currentY + itemFullHeight;
      }
    }

    // 2. Backward pass: Nếu nhãn dưới cùng bị tràn đáy màn hình, đẩy ngược dồn lên trên
    if (activeBadges[activeBadges.length - 1].currentY > maxAllowedY) {
      activeBadges[activeBadges.length - 1].currentY = maxAllowedY;
      for (let i = activeBadges.length - 2; i >= 0; i--) {
        const next = activeBadges[i + 1];
        const curr = activeBadges[i];
        if (curr.currentY > next.currentY - itemFullHeight) {
          curr.currentY = next.currentY - itemFullHeight;
        }
      }
    }

    // 3. Đảm bảo nhãn trên cùng không bị tràn đỉnh
    if (activeBadges[0].currentY < minAllowedY) {
      activeBadges[0].currentY = minAllowedY;
      for (let i = 1; i < activeBadges.length; i++) {
        const prev = activeBadges[i - 1];
        const curr = activeBadges[i];
        if (curr.currentY < prev.currentY + itemFullHeight) {
          curr.currentY = prev.currentY + itemFullHeight;
        }
      }
    }

    // Giới hạn tọa độ X trong màn hình
    const badgeWidth = 145;
    let finalX = targetX !== null ? targetX : containerWidth - badgeWidth - 20;
    finalX = Math.max(10, Math.min(finalX, containerWidth - badgeWidth - 10));

    // Áp dụng vị trí hiển thị mượt mà bằng CSS transform 3D GPU acceleration
    for (const item of activeBadges) {
      const topOffset = item.currentY - badgeHeight / 2;
      item.element.style.transform = `translate3d(${finalX}px, ${topOffset}px, 0)`;
    }
  }

  _startUpdateLoop() {
    const chart = this._chartManager._chart;
    if (!chart) return;

    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleTimeRangeChange(() => {
      this.updatePositions();
    });

    timeScale.subscribeVisibleLogicalRangeChange(() => {
      this.updatePositions();
    });

    if (this._container) {
      this._resizeObserver = new ResizeObserver(() => {
        this.updatePositions();
      });
      this._resizeObserver.observe(this._container);
    }
  }

  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._badgeWrap) {
      this._badgeWrap.remove();
      this._badgeWrap = null;
    }
    if (this._dotWrap) {
      this._dotWrap.remove();
      this._dotWrap = null;
    }
    this._badges.clear();
    this._dots.clear();
    this._latestData.clear();
  }
}
