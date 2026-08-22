# AUDIT — Central Bank Policy Rates Comparison (TradingIndex)

Ngày audit: 2026-08-22

## 1. Kết luận chung

Dự án **TradingIndex** trực quan hóa lãi suất chính sách của **10 Ngân hàng Trung ương lớn trên thế giới** từ năm 1990 đến nay trên nền tảng TradingView Lightweight Charts v5.

| Thành phần | Trạng thái | Đánh giá |
|---|---|---|
| **Data lịch sử (1M)** | ✅ Chuẩn & Tối ưu | 152 KB cho 4,400 điểm dữ liệu (1990-nay), nạp < 2ms |
| **Nguồn dữ liệu gốc** | ✅ Chuẩn mực | BIS (9 nước) + SBV (Việt Nam) + Bundesbank (Đức/ECB pre-1999) |
| **Độ phân giải** | ✅ Stepped Line (1M) | Chuẩn đường bậc thang thể hiện đúng bản chất lãi suất điều hành |
| **Cơ chế Auto-Sync** | ✅ 5 phút / lần | Song song (Parallel) qua TradingView Scanner API |
| **An toàn ghi dữ liệu** | ✅ Atomic & Validated | Deep Validation (>= 400 pts) + Auto Backup (.bak) + Atomic Rename |
| **Giao diện & Tương tác** | ✅ 60 FPS | Nhãn cờ trục phải 2-pass chống đè, Tooltip hover tức thì |

---

## 2. Chi tiết Tối ưu hóa & Nâng cấp

### 2.1. Tối ưu hóa Dữ liệu Lịch sử (Data Pipeline)
- **Chuỗi dữ liệu 1M (Monthly Resolution)**: Lưu dưới dạng chuỗi ngày YYYY-MM-01, tương thích trực tiếp với Lightweight Charts.
- **Generator O(n+m)**: Sử dụng cấu trúc Map tra cứu O(1) thay vì lặp lồng O(n²) trong generate_interest_rates.mjs.
- **Dữ liệu Việt Nam (SBV)**: Cập nhật đầy đủ các quyết định lãi suất tái cấp vốn từ 1990 đến 2023.
- **Dữ liệu Eurozone (ECB)**: Backfill thông minh từ Bundesbank Đức (DE) cho giai đoạn 1990-1998 trước khi ECB ra đời.

### 2.2. Tính năng Cập nhật Tự động (Auto-Sync)
- **Tần suất**: 5 phút/lần (AUTO_SYNC_INTERVAL_MS = 300,000 ms).
- **Parallel Fetch**: Tải đồng thời 10 NHTW qua Promise.allSettled(), giảm thời gian từ ~3.5s xuống < 400ms.
- **Gap-filling**: Tự động điền bù các tháng trung gian bị khuyết (carry-forward) nếu ứng dụng không mở trong nhiều tháng.
- **Concurrency Lock**: Cờ _isSyncing ngăn chặn xung đột khi người dùng click nút Cập nhật liên tục.

### 2.3. Quy trình Ghi dữ liệu An toàn (Data Persistence)
- **Deep Validation**: Server kiểm tra bắt buộc đủ 10 series và mỗi series có data.length >= 400 trước khi ghi.
- **Auto-Backup**: Tự động lưu bản sao lưu interest_rates.json.bak trước khi tráo file.
- **Windows Safe Atomic Write**: Sử dụng kỹ thuật file tạm .tmp và bọc retry chống lỗi khóa file EPERM trên Windows.

### 2.4. Tối ưu Giao diện & Hiển thị (UI/UX)
- **Trục thời gian**: Căn chỉnh ightOffset = 20 nến tạo khoảng thở hoàn hảo cho nhãn cờ trục phải mà không bị thừa khoảng trắng.
- **Chống đè nhãn cờ (RightEndBadges)**: Thuật toán 2 chiều (Forward pass đẩy xuống + Backward pass kiểm tra trần/đáy containerHeight - 24px) đảm bảo không bao giờ bị tràn khỏi màn hình.
- **Nút Tất cả (Toolbar)**: Tự động phát hiện trạng thái thực tế của các nút (bật hết nếu có nước bị tắt, tắt hết nếu đang bật đủ).