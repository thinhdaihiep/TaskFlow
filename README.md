# TaskFlow - Hệ thống Quản lý & Theo dõi Tiến độ Công việc

TaskFlow là ứng dụng web hiện đại, trực quan dùng để phân công nhiệm vụ và theo dõi tiến độ công việc hàng ngày của từng thành viên trong nhóm. Ứng dụng hỗ trợ thiết kế đáp ứng hoàn hảo trên cả máy tính và điện thoại thông minh, hỗ trợ Chế độ Sáng/Tối linh hoạt.

---

## 🚀 Tính Năng Nổi Bật

### 1. Phân Quyền Vai Trò (Authentication & Roles)
Hệ thống phân chia rõ ràng hai vai trò chính:
- **Quản trị (Sếp):** Có toàn quyền tạo, sửa, xóa nhiệm vụ, phân công cho một hoặc nhiều thành viên, và theo dõi trực quan bảng điều khiển (Dashboard) của toàn nhóm.
- **Thành viên (Nhân viên):** Chỉ hiển thị các nhiệm vụ được giao cho chính họ. Có khả năng cập nhật tiến trình hàng ngày (% hoàn thành, nội dung đã làm, khó khăn và ghi chú) và chỉnh sửa bản cập nhật trong ngày.

### 2. Dashboard Trực Quan Cho Sếp
- **Thống kê tổng hợp:** Tổng số việc, đang làm, đã hoàn thành, quá hạn và số việc chưa cập nhật hôm nay.
- **Biểu đồ chuyên sâu (Custom SVG):**
  - Biểu đồ tròn biểu thị tỷ lệ trạng thái công việc.
  - Biểu đồ tiến độ trung bình của từng nhân sự.
  - Biểu đồ cột biểu thị khối lượng công việc được giao.
  - Biểu đồ xu hướng tiến độ tích lũy theo thời gian.
- **Bảng dữ liệu mạnh mẽ:** Hỗ trợ Tìm kiếm và Lọc đa dạng theo thành viên, trạng thái, loại công việc và mốc thời gian bắt đầu kèm theo Phân trang tối ưu.

### 3. Dashboard Cho Thành Viên
- Danh sách nhiệm vụ đang thực hiện trực quan dạng thẻ thông tin.
- Danh sách nhắc nhở các việc chưa cập nhật tiến độ hôm nay.
- Widget thống kê nhanh hiệu suất và các ghi chú gần đây nhất của nhóm.

### 4. Dòng Thời Gian Lịch Sử (Timeline)
- Lưu vết toàn bộ lịch sử cập nhật tiến độ của từng nhiệm vụ.
- Hiển thị chi tiết: người cập nhật, ngày, %, nội dung đã làm, khó khăn gặp phải, ghi chú bổ sung.

---

## 🛠️ Hướng Dẫn Chạy Dự Án

### 1. Cài đặt các thư viện cần thiết:
```bash
npm install
```

### 2. Chạy ứng dụng ở chế độ Phát triển (Development Mode):
```bash
npm run dev
```
Truy cập ứng dụng tại địa chỉ: `http://localhost:3000`

### 3. Biên dịch và Đóng gói ứng dụng (Production Build):
```bash
npm run build
```

### 4. Chạy ứng dụng đã biên dịch (Production Run):
```bash
npm start
```

---

## 📂 Cơ Cấu Mã Nguồn (Modules)

Dự án được cấu trúc rõ ràng theo định hướng dễ mở rộng lâu dài:
- `/src/types.ts`: Định nghĩa toàn bộ kiểu dữ liệu (Nhiệm vụ, Cập nhật tiến độ, Người dùng, Vai trò).
- `/src/server/db.ts`: Trình quản lý dữ liệu lưu trữ bền vững (Local JSON) kèm dữ liệu mẫu tiếng Việt phong phú.
- `/server.ts`: Hệ thống API Express cho phép Đăng nhập, truy xuất Tasks, đăng ký cập nhật tiến độ hằng ngày bền vững.
- `/src/components/Login.tsx`: Màn hình đăng nhập bảo mật có hỗ trợ Đăng nhập nhanh các tài khoản thử nghiệm.
- `/src/components/ThemeToggle.tsx`: Nút chuyển đổi Chế độ Sáng/Tối.
- `/src/components/CustomCharts.tsx`: Module xử lý đồ họa trực quan (Pie, Bar, Area charts) dựng hoàn toàn bằng SVG tối ưu hiệu năng và responsive.
- `/src/App.tsx`: Module chính quản lý trạng thái, xử lý lọc/tìm kiếm, phân trang và tương tác UI/UX của hai nhóm đối tượng.
