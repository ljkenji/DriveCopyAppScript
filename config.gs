/*
 * File cấu hình cho DriveCopyAppScript
 * Author: Lj Kenji FB: https://fb.com/lj.kenji
 */

/**
 * Cấu hình chính của DriveCopyAppScript
 */
const CONFIG = {

  // ==================== CẤU HÌNH FOLDER ====================

  /**
   * URL folder nguồn (source) - Folder cần copy
   */
  SOURCE_FOLDER_URL: "https://drive.google.com/drive/folders/abc",

  /**
   * URL folder đích (destination) - Nơi sẽ paste folder
   */
  DESTINATION_FOLDER_URL: "https://drive.google.com/drive/folders/def",

  // ==================== CẤU HÌNH TRIGGER ====================

  TRIGGER_INTERVAL_GMAIL: 10,
  TRIGGER_INTERVAL_OTHER: 30,
  AUTO_TRIGGER_INTERVAL_MINUTES: 7,    // Khoảng thời gian trigger tự động (phút)
  AUTO_TRIGGER_MAX_RUNTIME_HOURS: 6,   // Thời gian tối đa trigger hoạt động (giờ)

  // ==================== CẤU HÌNH TÊN FILE/FOLDER ====================

  COPYING_FOLDER_PREFIX: "chuacopyxong ",
  NEW_COPY_PREFIX: "Copy of ",
  AUTO_RESUME_ON_MARKER: "AutoResumeOn",
  AUTO_RESUME_OFF_MARKER: "AutoResumeOff",

  // ==================== CẤU HÌNH EMAIL ====================

  EMAIL_ERROR_SUBJECT: "Drive Copy AppScript - Có lỗi trong quá trình Copy.",
  EMAIL_SUCCESS_SUBJECT: "Drive Copy AppScript - Đã Copy thành công.",
  GITHUB_ISSUE_URL: "https://github.com/ljkenji/DriveCopyAppScript/issues",
  TOOL_NAME: "DriveCopyAppScript",

  // ==================== CẤU HÌNH LOGGING ====================

  LOG_FILE_PREFIX: "Log of ",
  LOG_HEADERS: ['Time', 'File Name', 'Size Items', 'Total Items', 'Number Of Files', 'Number Of Folders', 'Total Size'],

  // ==================== CẤU HÌNH TRACKING SYSTEM ====================

  TRACKING_SHEET_NAME_PATTERN: "Copy Tracking - {SOURCE_ID} to {DEST_ID}",
  TRACKING_SHEET_EXTENSION: "",
  TRACKING_HEADERS: ['STT', 'Tên', 'Loại', 'Kích thước', 'Đường dẫn', 'Trạng thái'],

  COPY_STATUS: {
    PENDING: {
      text: "Chưa copy",
      backgroundColor: "#FF0000",
      fontColor: "#FFFFFF"
    },
    COMPLETED: {
      text: "Đã copy",
      backgroundColor: "#00FF00",
      fontColor: "#FFFFFF"
    },
    ERROR: {
      text: "Lỗi copy",
      backgroundColor: "#FFFF00",
      fontColor: "#000000"
    },
    NOT_FOUND: {
      text: "File không tồn tại",
      backgroundColor: "#808080",
      fontColor: "#FFFFFF"
    }
  },

  MAX_FILES_PER_RUN: 30,               // Giảm từ 50 xuống 30 để tránh timeout

  // ==================== CẤU HÌNH PERFORMANCE (MỚI) ====================

  // Batch processing settings - Tối ưu hóa để tránh timeout
  BATCH_SIZE_SHEETS: 300,           // Giảm từ 500 xuống 300 cho sheet operations
  BATCH_SIZE_FORMATS: 200,          // Thêm mới: Giới hạn format operations để tránh timeout
  BATCH_SIZE_DRIVE: 100,            // Số operations tối đa cho batch drive operations
  MEMORY_CLEANUP_THRESHOLD: 5000,   // Threshold để trigger memory cleanup

  // Chunking settings cho large datasets
  SCAN_CHUNK_SIZE: 500,             // Số items tối đa mỗi chunk khi scan
  FORMAT_CHUNK_SIZE: 100,           // Số format operations mỗi chunk
  PROGRESSIVE_FLUSH_THRESHOLD: 150, // Flush khi đạt threshold này

  // API Rate limiting settings
  API_DELAY_MIN_MS: 100,            // Delay tối thiểu giữa API calls (ms)
  API_DELAY_MAX_MS: 5000,           // Delay tối đa cho exponential backoff (ms)
  API_RETRY_MAX: 3,                 // Số lần retry tối đa cho API calls

  // Pagination settings cho large folders
  FOLDER_SCAN_PAGE_SIZE: 800,       // Giảm từ 1000 xuống 800 items mỗi lần scan
  LARGE_FOLDER_THRESHOLD: 1500,     // Giảm từ 2000 xuống 1500 để xử lý sớm hơn

  // Timeout prevention settings
  EXECUTION_TIME_LIMIT_MS: 300000,  // 5 phút (300 giây) - dành 1 phút buffer
  PROGRESS_SAVE_INTERVAL: 100,      // Lưu progress mỗi 100 operations
  ENABLE_PROGRESSIVE_PROCESSING: true, // Bật xử lý từng phần

  // Performance monitoring
  ENABLE_PERFORMANCE_MONITORING: true,  // Bật/tắt performance monitoring
  ENABLE_MEMORY_TRACKING: true,         // Bật/tắt memory tracking
  ENABLE_API_QUOTA_MANAGEMENT: true,    // Bật/tắt API quota management

  // ==================== CẤU HÌNH NÂNG CAO ====================

  SEND_COMPLETION_EMAIL: true,
  SEND_ERROR_EMAIL: true,
  AUTO_CREATE_TRIGGER: true,
  AUTO_DELETE_TRIGGER: true
};

/**
 * Hàm lấy cấu hình
 */
function getConfig() {
  return CONFIG;
}

/**
 * Hàm lấy giá trị cấu hình cụ thể
 */
function getConfigValue(key, defaultValue = null) {
  return CONFIG.hasOwnProperty(key) ? CONFIG[key] : defaultValue;
}

/**
 * Hàm validate cấu hình
 */
function validateConfig() {
  const requiredFields = [
    'SOURCE_FOLDER_URL',
    'DESTINATION_FOLDER_URL'
  ];

  for (let field of requiredFields) {
    if (!CONFIG[field] || CONFIG[field].includes('YOUR_')) {
      Logger.log(`Lỗi: Vui lòng cấu hình ${field} trong file config.gs`);
      return false;
    }
  }

  return true;
}
