/**
 * config.js — Cấu hình hệ thống So sánh Lãi suất 10 Ngân hàng Trung ương
 * Timeframe: 1M (Mỗi điểm dữ liệu là 1 Tháng / Monthly Resolution)
 */

export const INDICATORS = [
  {
    id: 'policy_rates',
    name: 'Lãi suất Điều hành',
    shortName: 'Lãi suất',
    unit: '%',
    icon: '🏦',
    file: 'interest_rates.json',
    default: true,
    description: 'Lãi suất mục tiêu chính sách tiền tệ của các NHTW'
  },
  {
    id: 'real_rates',
    name: 'Lãi suất Thực',
    shortName: 'L/S Thực',
    unit: '%',
    icon: '🎯',
    file: 'real_rates.json',
    description: 'Lãi suất thực tế theo phương trình Fisher (Lãi suất điều hành - Lạm phát CPI)'
  },
  {
    id: 'bond_yields_10y',
    name: 'Trái phiếu 10Y',
    shortName: 'TP 10 Năm',
    unit: '%',
    icon: '🏛️',
    file: 'bond_yields_10y.json',
    description: 'Lợi suất Trái phiếu Chính phủ kỳ hạn 10 năm'
  },
  {
    id: 'inflation_cpi',
    name: 'Lạm phát CPI',
    shortName: 'Lạm phát',
    unit: '%',
    icon: '📈',
    file: 'inflation_cpi.json',
    description: 'Chỉ số Giá Tiêu dùng Tăng trưởng theo năm (CPI YoY %)'
  },
  {
    id: 'unemployment',
    name: 'Tỷ lệ Thất nghiệp',
    shortName: 'Thất nghiệp',
    unit: '%',
    icon: '👷',
    file: 'unemployment.json',
    description: 'Tỷ lệ Thất nghiệp trên tổng lực lượng lao động'
  },
  {
    id: 'gdp_growth',
    name: 'Tăng trưởng GDP',
    shortName: 'GDP YoY',
    unit: '%',
    icon: '🏗️',
    file: 'gdp_growth.json',
    description: 'Tốc độ Tăng trưởng Tổng sản phẩm Quốc nội (GDP YoY %)'
  }
];

export const CENTRAL_BANKS = [
  {
    code: 'US',
    ticker: 'USINTR',
    tickers: {
      policy_rates: 'ECONOMICS:USINTR',
      bond_yields_10y: 'TVC:US10Y',
      inflation_cpi: 'ECONOMICS:USIRYY',
      unemployment: 'ECONOMICS:USUR',
      gdp_growth: 'ECONOMICS:USGDPYY'
    },
    name: 'Mỹ',
    englishName: 'United States',
    institution: 'Federal Reserve',
    flagIcon: './assets/flags/us.svg',
    color: '#2563EB', // 🔵 Xanh dương (Royal Blue)
    lineWidth: 3,
    defaultVisible: true,
  },
  {
    code: 'XM',
    ticker: 'EUINTR',
    tickers: {
      policy_rates: 'ECONOMICS:EUINTR',
      bond_yields_10y: 'TVC:DE10Y',
      inflation_cpi: 'ECONOMICS:EUIRYY',
      unemployment: 'ECONOMICS:EUUR',
      gdp_growth: 'ECONOMICS:EUGDPYY'
    },
    name: 'Khu vực Euro',
    englishName: 'Eurozone',
    institution: 'European Central Bank',
    flagIcon: './assets/flags/eu.svg',
    color: '#EAB308', // 🟡 Vàng kim (Gold Yellow)
    lineWidth: 3,
    defaultVisible: true,
  },
  {
    code: 'VN',
    ticker: 'VNINTR',
    tickers: {
      policy_rates: 'ECONOMICS:VNINTR',
      bond_yields_10y: 'TVC:VN10Y',
      inflation_cpi: 'ECONOMICS:VNIRYY',
      unemployment: 'ECONOMICS:VNUR',
      gdp_growth: 'ECONOMICS:VNGDPYY'
    },
    name: 'Việt Nam',
    englishName: 'Vietnam',
    institution: 'State Bank of Vietnam',
    flagIcon: './assets/flags/vn.svg',
    color: '#16A34A', // 🟢 Xanh lá cây (Vivid Green)
    lineWidth: 3,
    defaultVisible: true,
  },
  {
    code: 'GB',
    ticker: 'GBINTR',
    tickers: {
      policy_rates: 'ECONOMICS:GBINTR',
      bond_yields_10y: 'TVC:GB10Y',
      inflation_cpi: 'ECONOMICS:GBIRYY',
      unemployment: 'ECONOMICS:GBUR',
      gdp_growth: 'ECONOMICS:GBGDPYY'
    },
    name: 'Anh',
    englishName: 'United Kingdom',
    institution: 'Bank of England',
    flagIcon: './assets/flags/gb.svg',
    color: '#F43F5E', // 🌸 Hồng cánh sen (Hot Rose Pink)
    lineWidth: 3,
    defaultVisible: true,
  },
  {
    code: 'CA',
    ticker: 'CAINTR',
    tickers: {
      policy_rates: 'ECONOMICS:CAINTR',
      bond_yields_10y: 'TVC:CA10Y',
      inflation_cpi: 'ECONOMICS:CAIRYY',
      unemployment: 'ECONOMICS:CAUR',
      gdp_growth: 'ECONOMICS:CAGDPYY'
    },
    name: 'Canada',
    englishName: 'Canada',
    institution: 'Bank of Canada',
    flagIcon: './assets/flags/ca.svg',
    color: '#92400E', // 🟤 Nâu đồng (Caramel Brown)
    lineWidth: 3,
    defaultVisible: true,
  },
  {
    code: 'AU',
    ticker: 'AUINTR',
    tickers: {
      policy_rates: 'ECONOMICS:AUINTR',
      bond_yields_10y: 'TVC:AU10Y',
      inflation_cpi: 'ECONOMICS:AUIRYY',
      unemployment: 'ECONOMICS:AUUR',
      gdp_growth: 'ECONOMICS:AUGDPYY'
    },
    name: 'Úc',
    englishName: 'Australia',
    institution: 'Reserve Bank of Australia',
    flagIcon: './assets/flags/au.svg',
    color: '#F97316', // 🟠 Cam tươi (Pure Orange)
    lineWidth: 3,
    defaultVisible: true,
  },
  {
    code: 'NZ',
    ticker: 'NZINTR',
    tickers: {
      policy_rates: 'ECONOMICS:NZINTR',
      bond_yields_10y: 'TVC:NZ10Y',
      inflation_cpi: 'ECONOMICS:NZIRYY',
      unemployment: 'ECONOMICS:NZUR',
      gdp_growth: 'ECONOMICS:NZGDPYY'
    },
    name: 'New Zealand',
    englishName: 'New Zealand',
    institution: 'Reserve Bank of New Zealand',
    flagIcon: './assets/flags/nz.svg',
    color: '#06B6D4', // 🩵 Xanh lơ Neon (Electric Cyan)
    lineWidth: 3,
    defaultVisible: true,
  },
  {
    code: 'CH',
    ticker: 'CHINTR',
    tickers: {
      policy_rates: 'ECONOMICS:CHINTR',
      bond_yields_10y: 'TVC:CH10Y',
      inflation_cpi: 'ECONOMICS:CHIRYY',
      unemployment: 'ECONOMICS:CHUR',
      gdp_growth: 'ECONOMICS:CHGDPYY'
    },
    name: 'Thụy Sỹ',
    englishName: 'Switzerland',
    institution: 'Swiss National Bank',
    flagIcon: './assets/flags/ch.svg',
    color: '#475569', // 🩶 Xám than chì (Slate Gray)
    lineWidth: 3,
    defaultVisible: true,
  },
  {
    code: 'JP',
    ticker: 'JPINTR',
    tickers: {
      policy_rates: 'ECONOMICS:JPINTR',
      bond_yields_10y: 'TVC:JP10Y',
      inflation_cpi: 'ECONOMICS:JPIRYY',
      unemployment: 'ECONOMICS:JPUR',
      gdp_growth: 'ECONOMICS:JPGDPYY'
    },
    name: 'Nhật Bản',
    englishName: 'Japan',
    institution: 'Bank of Japan',
    flagIcon: './assets/flags/jp.svg',
    color: '#9333EA', // 🟣 Tím hoa cà (Vivid Purple)
    lineWidth: 3,
    defaultVisible: true,
  },
  {
    code: 'CN',
    ticker: 'CNINTR',
    tickers: {
      policy_rates: 'ECONOMICS:CNINTR',
      bond_yields_10y: 'TVC:CN10Y',
      inflation_cpi: 'ECONOMICS:CNIRYY',
      unemployment: 'ECONOMICS:CNUR',
      gdp_growth: 'ECONOMICS:CNGDPYY'
    },
    name: 'Trung Quốc',
    englishName: 'China',
    institution: "People's Bank of China",
    flagIcon: './assets/flags/cn.svg',
    color: '#DC2626', // 🔴 Đỏ cờ tươi (Pure Crimson Red)
    lineWidth: 3,
    defaultVisible: true,
  }
];

export const CURRENT_TIMEFRAME = '1M'; // Khung thời gian: 1 Tháng / điểm dữ liệu (Monthly Interval)

export const TIME_RANGES = [
  { id: '1Y', label: '1 Năm', days: 365 },
  { id: '3Y', label: '3 Năm', days: 365 * 3 },
  { id: '5Y', label: '5 Năm', days: 365 * 5 },
  { id: '10Y', label: '10 Năm', days: 365 * 10 },
  { id: 'ALL', label: 'Tất cả (1990-nay)', isAll: true },
];

export const THEMES = {
  light: {
    name: 'light',
    bg: 'transparent',
    text: '#1a1f36',
    grid: 'rgba(0, 0, 0, 0.04)',
    border: 'rgba(0, 0, 0, 0.08)',
    crosshair: 'rgba(26, 31, 54, 0.45)',
    cardBg: 'rgba(255, 255, 255, 0.75)',
    cardBorder: 'rgba(255, 255, 255, 0.85)',
  },
  dark: {
    name: 'dark',
    bg: 'transparent',
    text: '#e2e8f0',
    grid: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(255, 255, 255, 0.08)',
    crosshair: 'rgba(226, 232, 240, 0.45)',
    cardBg: 'rgba(15, 23, 42, 0.75)',
    cardBorder: 'rgba(255, 255, 255, 0.14)',
  }
};

export const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 phút — tránh rate limit TradingView API
