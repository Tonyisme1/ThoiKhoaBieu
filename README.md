# 📅 Thời Khóa Biểu - Smart Timetable Manager

## 📖 Giới thiệu

Ứng dụng web quản lý thời khóa biểu hiện đại, đầy đủ tính năng cho sinh viên và giáo viên. Hỗ trợ đa tuần, điểm danh, ghi chú, dark mode và dashboard analytics chi tiết.

## 🎯 Vấn đề được giải quyết

Quản lý lịch học trong môi trường giáo dục thường gặp nhiều khó khăn:

- Thời khóa biểu giấy dễ thất lạc, hư hỏng
- Các app phức tạp đòi hỏi nhiều bước cài đặt
- Khó theo dõi điểm danh và tiến độ học tập
- Thiếu công cụ phân tích thống kê học kỳ

**Giải pháp:** Một ứng dụng web đơn giản, không cần cài đặt, chạy trực tiếp trên trình duyệt với đầy đủ tính năng quản lý học tập chuyên nghiệp.

## ✨ Tính năng chính

### 🗓️ Quản lý thời khóa biểu

- **Lưới 15 tiết/ngày:** Hiển thị trực quan theo từng tuần
- **Đa tuần linh hoạt:** Hỗ trợ cấu hình tuần bắt đầu tùy chỉnh
- **Ghi chú môn học:** Thêm notes cho từng môn với tự động phát hiện link
- **Color coding:** Phân biệt môn học bằng màu sắc
- **Responsive design:** Tối ưu cho desktop, tablet và mobile

### 🎨 Giao diện & Trải nghiệm

- **Dark Mode:** Chuyển đổi theme mượt mà với View Transition API
- **Tooltip chi tiết:** Hover để xem thông tin đầy đủ, có thể click link trong notes
- **Mini Calendar:** Nhảy nhanh đến tuần bất kỳ
- **Timeline Navigation:** Duyệt tuần bằng chips hoặc dropdown
- **Search nhanh:** Tìm kiếm môn học theo tên/giáo viên/phòng học

### 📊 Dashboard & Analytics

- **Chế độ xem kép:**
  - **Tuần hiện tại:** Thống kê chi tiết từng tuần
  - **Toàn học kỳ:** Tổng quan toàn bộ học kỳ
- **Thống kê tự động:**
  - Tổng môn học & tiết học
  - Lớp sắp tới (tìm kiếm toàn học kỳ)
  - Tỷ lệ điểm danh
  - Môn yêu thích
- **Biểu đồ trực quan:**
  - Phân bổ tiết học theo ngày/tuần
  - Click tuần để xem chi tiết
  - Danh sách ngày nghỉ

### ✅ Điểm danh & Theo dõi

- **Điểm danh chi tiết:** Đi học / Nghỉ / Đi muộn
- **Timeline điểm danh:** Theo dõi lịch sử từng buổi học
- **Thống kê tự động:** Tính toán chính xác theo giờ học thực tế
- **Filter theo môn:** Lọc nhanh điểm danh theo môn học

### 📝 Quản lý học tập

- **Bài tập:** Thêm, sửa, xóa assignment với deadline
- **Lịch thi:** Quản lý lịch thi cuối kỳ
- **Ngày nghỉ:** Đánh dấu các tuần nghỉ lễ
- **Ghi chú chung:** Notes riêng cho từng tab
- **Yêu thích:** Đánh dấu môn quan trọng

### 💾 Dữ liệu

- **LocalStorage:** Lưu tự động mọi thay đổi
- **Export/Import JSON:** Sao lưu và khôi phục dữ liệu
- **Không cần server:** Chạy offline hoàn toàn

## 🚀 Hướng dẫn sử dụng

### Khởi động

1. Mở file `index.html` trên trình duyệt (Chrome, Edge, Firefox)
2. Không cần cài đặt hay server

### Thêm môn học

1. Click nút **"+ Thêm môn"**
2. Điền thông tin: Tên môn, giáo viên, phòng học, thời gian
3. Chọn tuần học (Tất cả / Chẵn / Lẻ / Tùy chọn)
4. Chọn màu và thêm ghi chú (tùy chọn)
5. Click **"Lưu"**

### Xem thống kê

1. Mở tab **"Dashboard"**
2. Chọn chế độ xem:
   - **Toàn học kỳ:** Xem tổng quan
   - **Tuần hiện tại:** Xem chi tiết tuần
3. Click vào cột tuần trong biểu đồ để xem tuần đó

### Điểm danh

1. Mở tab **"Điểm danh"**
2. Click vào buổi học để đánh dấu: Đi / Nghỉ / Muộn
3. Xem thống kê tổng hợp ở đầu trang

### Tùy chỉnh

- **Theme:** Click icon 🌙/☀️ ở header
- **Tuần bắt đầu:** Vào tab Cài đặt → Chọn ngày bắt đầu
- **Backup:** Export JSON để sao lưu

## 📁 Cấu trúc dự án

```
Thoi_Khoa_Bieu-JS/
├── index.html          # Giao diện chính
├── README.md           # Tài liệu
├── Lich_Hoc.json       # Dữ liệu mẫu (không sử dụng khi có LocalStorage)
├── css/
│   ├── main.css        # Import tổng hợp
│   ├── variables.css   # Biến CSS & dark mode
│   ├── layout.css      # Layout grid & responsive
│   └── components.css  # Component styles
└── js/
    ├── app.js          # Logic chính & UI
    ├── core.js         # Utils & data handling
    └── ui.js           # UI helpers & rendering
```

## 🎨 Công nghệ sử dụng

- **HTML5** - Cấu trúc semantic
- **CSS3** - Variables, Grid, Flexbox, Transitions
- **JavaScript (Vanilla)** - Không dùng framework
- **LocalStorage API** - Lưu trữ dữ liệu
- **View Transition API** - Chuyển theme mượt mà

## 🔧 Tùy chỉnh dữ liệu

### Định dạng JSON

```json
{
  "courses": [
    {
      "id": 1234567890,
      "name": "Lập trình Web",
      "teacher": "Nguyễn Văn A",
      "day": 2,
      "room": "A101",
      "startPeriod": 1,
      "periodCount": 3,
      "weeks": [1, 2, 3, 4],
      "weekString": "1, 2, 3, 4",
      "color": "#3b82f6",
      "notes": "Link tài liệu: https://example.com"
    }
  ],
  "holidays": [
    {
      "name": "Tết Nguyên Đán",
      "weeks": [5, 6]
    }
  ],
  "settings": {
    "startDate": "2026-01-26",
    "startWeek": 22,
    "totalWeeks": 22,
    "weekOffsetReal": 22
  },
  "theme": "light",
  "attendance": {},
  "assignments": [],
  "exams": []
}
```

### Các trường dữ liệu

#### Course

- `id`: Unique ID (timestamp)
- `name`: Tên môn học
- `teacher`: Giáo viên
- `day`: Thứ (0=Ghi chú, 1=T2, 2=T3,..., 7=CN)
- `room`: Phòng học
- `startPeriod`: Tiết bắt đầu (1-15)
- `periodCount`: Số tiết
- `weeks`: Mảng tuần học
- `color`: Mã màu hex
- `notes`: Ghi chú (tự động link hóa URL)
- `isFavorite`: Đánh dấu yêu thích

#### Settings

- `startDate`: Ngày bắt đầu học kỳ (YYYY-MM-DD)
- `startWeek`: Tuần bắt đầu
- `totalWeeks`: Tổng số tuần học
- `weekOffsetReal`: Offset tuần

## ✅ Trạng thái dự án

- ✅ **Visual Design** - Gradients, responsive, modern UI
- ✅ **Core Features** - CRUD môn học, multi-week support
- ✅ **Interactions** - Search, calendar, favorites, tooltips
- ✅ **Dashboard & Analytics** - Dual-view dashboard, charts
- ✅ **Attendance System** - Điểm danh chi tiết với timeline
- ✅ **Dark Mode** - Theme switching với transitions
- ✅ **Data Management** - Export/import, localStorage
- ✅ **Notes System** - Course notes với clickable links
- ✅ **UI Polish** - Compact design, hover effects

## 🎯 Roadmap

### Đã hoàn thành

- [x] Thời khóa biểu đa tuần
- [x] Dashboard analytics 2 chế độ
- [x] Điểm danh tự động
- [x] Dark mode
- [x] Ghi chú môn học với link
- [x] Tìm kiếm nhanh
- [x] Mini calendar
- [x] Export/Import

### Tính năng tiềm năng

- [ ] Thông báo lớp sắp tới (browser notification)
- [ ] PWA support (cài đặt như app)
- [ ] Sync multi-device (Firebase/Supabase)
- [ ] Widget customization
- [ ] GPA calculator
- [ ] Study timer/Pomodoro

## 📄 License

MIT License - Tự do sử dụng và chỉnh sửa

## 👤 Tác giả

Dự án cá nhân - Smart Timetable Manager

---

**Phiên bản:** 2.0  
**Cập nhật:** 2026-01-29
