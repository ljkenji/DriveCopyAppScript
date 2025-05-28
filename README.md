# DriveCopyAppScript

**Công cụ copy files và folders giữa các Google Drive với tracking system thông minh**

## 📋 Mô tả dự án

DriveCopyAppScript là một công cụ mạnh mẽ được phát triển trên Google Apps Script để copy toàn bộ cấu trúc files và folders từ một Google Drive này sang Google Drive khác. Công cụ hỗ trợ copy đệ quy với tracking trạng thái chi tiết qua Google Sheets và tối ưu hóa hiệu năng cao.

## ✨ Tính năng chính

### 🔄 Copy thông minh
- **Copy đệ quy**: Hỗ trợ copy toàn bộ cấu trúc folders và subfolders
- **Kiểm tra trùng lặp**: So sánh tên file + kích thước để tránh copy lại file đã tồn tại
- **Resume capability**: Tiếp tục copy từ điểm dừng khi chạy lại script

### 📊 Tracking system với Google Sheets
- **Metadata tracking**: Theo dõi tổng số file, số lần chạy, file đã copy (rows 1-5)
- **Color coding**: Trạng thái file với màu sắc trực quan
  - 🔴 **Chưa copy** (đỏ): File chưa được xử lý
  - 🟢 **Đã copy** (xanh lá): File đã copy thành công  
  - 🟡 **Lỗi copy** (vàng): File gặp lỗi khi copy
  - ⚫ **File không tồn tại** (xám): File đã bị xóa
- **Hierarchical display**: Hiển thị cấu trúc thư mục với đường dẫn đầy đủ

### ⚡ Tối ưu hóa hiệu năng
- **Batch operations**: Xử lý hàng loạt để giảm API calls
- **Rate limiting**: Tuân thủ giới hạn Google API (300 requests/phút)
- **Exponential backoff**: Tự động retry với delay tăng dần khi gặp lỗi
- **Memory management**: Quản lý bộ nhớ cho folders lớn (>2000 items)
- **Smart caching**: Cache metadata để tăng tốc độ xử lý

### 📧 Thông báo và báo cáo
- **Email notifications**: Thông báo khi hoàn thành hoặc gặp lỗi
- **Detailed reports**: Báo cáo chi tiết về quá trình copy
- **Performance metrics**: Thống kê hiệu năng và thời gian xử lý

## 📁 Cấu trúc file

```
DriveCopyAppScript/
├── DriveCopyCore.gs      # Engine chính xử lý copy và tracking
├── PerformanceEngine.gs  # Module tối ưu hóa hiệu năng và API management
├── Utilities.gs          # Các utility functions và email notifications
├── config.gs            # File cấu hình chính 
├── .gitignore           # Bảo vệ file config.gs khỏi commit
└── README.md           # Tài liệu hướng dẫn
```

### Hệ thống cấu hình
- **config.example.gs**: Template với placeholder values
- **config.gs**: File cấu hình thực tế (được gitignore để bảo mật)
- **Tách biệt bảo mật**: Tránh commit thông tin nhạy cảm lên repository

## 🚀 Hướng dẫn cài đặt

### Bước 1: Tạo Google Apps Script Project
1. Truy cập [Google Apps Script](https://script.google.com)
2. Tạo project mới: **New Project**
3. Đặt tên project: `DriveCopyAppScript`

### Bước 2: Copy code files
1. Tạo 4 files .gs trong project:
   - `DriveCopyCore.gs`
   - `PerformanceEngine.gs` 
   - `Utilities.gs`
   - `config.gs`

2. Copy nội dung từ repository vào từng file tương ứng

### Bước 3: Cấu hình config.gs
1. Cấu hình đường dẫn thư mục:
```javascript
const CONFIG = {
  SOURCE_FOLDER_URL: "https://drive.google.com/drive/folders/YOUR_SOURCE_FOLDER_ID",
  DESTINATION_FOLDER_URL: "https://drive.google.com/drive/folders/YOUR_DEST_FOLDER_ID",
  // ... các cấu hình khác
};
```


### Bước 4: Setup permissions
1. Chạy function `main()` lần đầu để trigger OAuth
2. Cấp quyền truy cập:
   - **Google Drive**: Đọc và ghi files/folders
   - **Google Sheets**: Tạo và chỉnh sửa spreadsheets
   - **Gmail**: Gửi email thông báo

## 📖 Hướng dẫn sử dụng

### Cách chạy script
1. Mở Google Apps Script project
2. Chọn function `main` từ dropdown
3. Click **Run** để bắt đầu copy
4. Theo dõi progress trong **Execution transcript**

### Monitoring progress
1. **Google Sheets tracking**: Tự động tạo file tracking trong folder đích
2. **Email notifications**: Nhận thông báo khi hoàn thành hoặc lỗi
3. **Logs**: Xem chi tiết trong Apps Script console

### Resume khi bị gián đoạn
- Script tự động phát hiện tracking sheet đã tồn tại
- Tiếp tục copy từ file chưa xử lý
- Không copy lại file đã hoàn thành

## ⚙️ Cấu hình chi tiết

### Cấu hình cơ bản
```javascript
// URLs folder nguồn và đích
SOURCE_FOLDER_URL: "https://drive.google.com/drive/folders/abc123"
DESTINATION_FOLDER_URL: "https://drive.google.com/drive/folders/def456"

// Prefix cho folder mới tạo
NEW_COPY_PREFIX: "Copy of "
```

### Cấu hình hiệu năng
```javascript
// Batch processing
BATCH_SIZE_SHEETS: 500,     // Số rows tối đa cho batch sheets operations
BATCH_SIZE_DRIVE: 100,      // Số operations tối đa cho batch drive operations

// API Rate limiting  
API_DELAY_MIN_MS: 100,      // Delay tối thiểu giữa API calls (ms)
API_DELAY_MAX_MS: 5000,     // Delay tối đa cho exponential backoff (ms)
API_RETRY_MAX: 3,           // Số lần retry tối đa

// Large folder handling
FOLDER_SCAN_PAGE_SIZE: 1000,      // Số items tối đa mỗi lần scan
LARGE_FOLDER_THRESHOLD: 2000,     // Threshold để coi là large folder
```

### Cấu hình tracking
```javascript
// Tracking sheet naming
TRACKING_SHEET_NAME_PATTERN: "Copy Tracking - {SOURCE_ID} to {DEST_ID}"

// Status colors
COPY_STATUS: {
  PENDING: { backgroundColor: "#FF0000", fontColor: "#FFFFFF" },    // Đỏ
  COMPLETED: { backgroundColor: "#00FF00", fontColor: "#FFFFFF" },  // Xanh lá
  ERROR: { backgroundColor: "#FFFF00", fontColor: "#000000" },      // Vàng
  NOT_FOUND: { backgroundColor: "#808080", fontColor: "#FFFFFF" }   // Xám
}
```

### Cấu hình email
```javascript
SEND_COMPLETION_EMAIL: true,    // Gửi email khi hoàn thành
SEND_ERROR_EMAIL: true,         // Gửi email khi có lỗi
EMAIL_SUCCESS_SUBJECT: "Đã Copy thành công",
EMAIL_ERROR_SUBJECT: "Có lỗi trong quá trình Copy"
```

## 🔧 Troubleshooting

### Lỗi thường gặp

#### 1. "Cấu hình không hợp lệ"
**Nguyên nhân**: URL folder trong config.gs không đúng format
**Giải pháp**: 
- Kiểm tra `SOURCE_FOLDER_URL` và `DESTINATION_FOLDER_URL`
- Đảm bảo URL có format: `https://drive.google.com/drive/folders/FOLDER_ID`

#### 2. "Không có quyền truy cập folder"
**Nguyên nhân**: Tài khoản không có quyền đọc folder nguồn hoặc ghi folder đích
**Giải pháp**:
- Kiểm tra quyền truy cập folder trong Google Drive
- Đảm bảo folder được share với tài khoản đang chạy script

#### 3. "API quota exceeded"
**Nguyên nhân**: Vượt quá giới hạn API của Google
**Giải pháp**:
- Tăng `API_DELAY_MIN_MS` trong config
- Giảm `BATCH_SIZE_DRIVE` và `BATCH_SIZE_SHEETS`
- Chờ và chạy lại sau vài phút

#### 4. "Script timeout"
**Nguyên nhân**: Script chạy quá 6 phút (giới hạn Google Apps Script)
**Giải pháp**:
- Script sẽ tự động dừng và lưu progress
- Chạy lại script để tiếp tục từ điểm dừng
- Giảm `MAX_FILES_PER_RUN` để xử lý ít file hơn mỗi lần

### Debug và monitoring
1. **Execution transcript**: Xem logs chi tiết trong Apps Script
2. **Tracking sheet**: Kiểm tra trạng thái từng file
3. **Email reports**: Nhận báo cáo chi tiết qua email

## 📋 Yêu cầu hệ thống

### Google Services
- **Google Apps Script**: Platform chạy script
- **Google Drive API**: Truy cập và copy files/folders  
- **Google Sheets API**: Tạo và cập nhật tracking sheets
- **Gmail API**: Gửi email thông báo

### Permissions cần thiết
- `https://www.googleapis.com/auth/drive` - Truy cập Google Drive
- `https://www.googleapis.com/auth/spreadsheets` - Tạo và chỉnh sửa Google Sheets
- `https://www.googleapis.com/auth/gmail.send` - Gửi email

### Giới hạn Google Apps Script
- **Execution time**: Tối đa 6 phút/lần chạy
- **API calls**: 300 requests/phút cho Drive API
- **Memory**: Giới hạn bộ nhớ cho large datasets

## ⚠️ Giới hạn và lưu ý

### API Limits
- **Google Drive API**: 300 requests/phút, 60 requests/phút/user
- **Google Sheets API**: 300 requests/phút
- **Script execution**: Tối đa 6 phút/lần chạy

### Performance considerations
- **Large folders**: Folders >2000 items sẽ được xử lý theo batch
- **File size**: Không giới hạn kích thước file (tùy thuộc Google Drive)
- **Concurrent execution**: Chỉ chạy 1 instance tại một thời điểm

### Bảo mật
- Sử dụng OAuth2 để xác thực, không lưu password
- Chỉ cấp quyền tối thiểu cần thiết

### Manual execution mode
- Script được thiết kế để chạy manual, không có auto-trigger
- Khi timeout, cần chạy lại manual để tiếp tục
- Không tạo marker files hay auto-resume mechanisms

## 👨‍💻 Tác giả

**Lj Kenji**
- Facebook: [https://fb.com/lj.kenji](https://fb.com/lj.kenji)
- GitHub: [https://github.com/ljkenji/DriveCopyAppScript](https://github.com/ljkenji/DriveCopyAppScript)

---

**⭐ Nếu project hữu ích, hãy star repository để ủng hộ tác giả!**
