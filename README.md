# Central Bank Policy Rates Comparison — TradingView Edition 📊

Ứng dụng web so sánh lãi suất chính sách của **10 Ngân hàng Trung ương lớn trên thế giới** với giao diện chuẩn TradingView (đường bậc thang Stepped Line), dữ liệu cập nhật tự động và hoàn toàn miễn phí.

---

## 🏦 10 Ngân hàng Trung ương được hỗ trợ

| Quốc gia | Cờ | Ticker | Ngân hàng Trung ương | Công cụ Lãi suất |
| :--- | :---: | :--- | :--- | :--- |
| **Mỹ** | 🇺🇸 | `USINTR` | Federal Reserve (Fed) | Federal Funds Rate (Target) |
| **Khu vực Euro** | 🇪🇺 | `EUINTR` | European Central Bank (ECB) | Deposit Facility / Main Refinancing Rate |
| **Việt Nam** | 🇻🇳 | `VNINTR` | Ngân hàng Nhà nước (SBV) | Lãi suất tái cấp vốn (Refinancing Rate) |
| **Anh** | 🇬🇧 | `GBINTR` | Bank of England (BoE) | Official Bank Rate |
| **Canada** | 🇨🇦 | `CAINTR` | Bank of Canada (BoC) | Policy Interest Rate |
| **Úc** | 🇦🇺 | `AUINTR` | Reserve Bank of Australia (RBA) | Cash Rate Target |
| **New Zealand** | 🇳🇿 | `NZINTR` | Reserve Bank of New Zealand (RBNZ) | Official Cash Rate (OCR) |
| **Thụy Sỹ** | 🇨🇭 | `CHINTR` | Swiss National Bank (SNB) | SNB Policy Rate |
| **Nhật Bản** | 🇯🇵 | `JPINTR` | Bank of Japan (BoJ) | Policy Rate / Call Rate |
| **Trung Quốc** | 🇨🇳 | `CNINTR` | People's Bank of China (PBoC) | 1-Year Loan Prime Rate (LPR) |

---

## ✨ Tính năng nổi bật

1. **Biểu đồ đường bậc thang (Stepped Line):** Đúng bản chất của lãi suất điều hành (giữ nguyên và nhảy nấc khi có quyết định chính sách mới).
2. **Bảng Legend On-Chart tương tác:**
   - Hiển thị cờ quốc gia, mã ticker, tên NHTW, lãi suất hiện tại và % thay đổi.
   - Click vào từng quốc gia để **bật/tắt** đường biểu đồ tương ứng.
3. **Chuyển đổi giao diện Sáng / Tối linh hoạt:**
   - Mặc định **Light Theme** (nền trắng chuẩn TradingView).
   - Chuyển sang **Dark Theme** bằng 1 cú nhấp chuột.
4. **Bộ chọn mốc thời gian (Time Range):**
   - Hỗ trợ xem: `1M`, `6M`, `YTD` (Đầu năm), `1Y`, `3Y`, `5Y`, `ALL` (Từ 2015 đến nay).
5. **Auto-Update & Free Data:**
   - Nạp dữ liệu lịch sử từ BIS và SBV.
   - Tự động kiểm tra và đồng bộ hóa lãi suất mới nhất từ nguồn cấp thời gian thực miễn phí.

---

## 🚀 Hướng dẫn khởi chạy

### Cách 1: Nhấp đúp file chạy (Windows)
- Nhấp đúp vào file `RealStrength.bat`. Trình duyệt sẽ tự động mở tại `http://localhost:8080`.

### Cách 2: Chạy qua dòng lệnh (Node.js)
```bash
node server.js --open
```

### Cách 3: Cập nhật lại toàn bộ chuỗi lịch sử từ BIS
```bash
node scripts/generate_interest_rates.mjs
```
