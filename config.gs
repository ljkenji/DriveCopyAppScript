/*
 * File cấu hình cho DriveCopyAppScript
 * Author: Lj Kenji FB: https://fb.com/lj.kenji
 */

/**
 * Cấu hình chính của DriveCopyAppScript
 */
const CONFIG = {

  // ==================== CẤU HÌNH TRIGGER ====================

  TRIGGER_INTERVAL_GMAIL: 10,
  TRIGGER_INTERVAL_OTHER: 30,
  AUTO_TRIGGER_INTERVAL_MINUTES: 10,    // Khoảng thời gian trigger tự động (phút)
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
 * Hàm lấy cấu hình (đã tích hợp caching cho folder URLs)
 */
function getConfig() {
  try {
    Logger.log("📋 Đang load cấu hình từ config.gs và folder.gs...");

    // Kiểm tra xem file folder.gs có tồn tại không
    let folderConfig;
    try {
      folderConfig = getFolderConfig(); // Sử dụng caching mechanism
      // Log message sẽ được hiển thị từ getFolderConfig() (cache hit/miss)
    } catch (error) {
      Logger.log("❌ Lỗi khi load file folder.gs: " + error.toString());
      Logger.log("💡 Hướng dẫn: Vui lòng tạo file folder.gs và cấu hình SOURCE_URL, DESTINATION_URL");

      // Clear cache khi có lỗi
      if (typeof clearFolderConfigCache === 'function') {
        clearFolderConfigCache();
      }

      throw new Error("File folder.gs không tồn tại hoặc có lỗi. Vui lòng kiểm tra file folder.gs và cấu hình đúng SOURCE_URL, DESTINATION_URL");
    }

    // Merge CONFIG với folder URLs
    const mergedConfig = {
      ...CONFIG,
      ...folderConfig
    };

    Logger.log("🔗 Đã merge cấu hình thành công - CONFIG + folder URLs");
    return mergedConfig;

  } catch (error) {
    Logger.log("💥 Lỗi nghiêm trọng khi load cấu hình: " + error.toString());

    // Clear cache khi có lỗi nghiêm trọng
    if (typeof clearFolderConfigCache === 'function') {
      clearFolderConfigCache();
    }

    throw error;
  }
}

/**
 * Hàm lấy giá trị cấu hình cụ thể
 */
function getConfigValue(key, defaultValue = null) {
  return CONFIG.hasOwnProperty(key) ? CONFIG[key] : defaultValue;
}

/**
 * Hàm validate cấu hình (đã cập nhật để kiểm tra folder.gs)
 */
function validateConfig() {
  try {
    Logger.log("🔍 Bắt đầu validate cấu hình...");

    // Lấy cấu hình đã merge
    const config = getConfig();

    // Kiểm tra các trường bắt buộc
    const requiredFields = [
      'SOURCE_FOLDER_URL',
      'DESTINATION_FOLDER_URL'
    ];

    for (let field of requiredFields) {
      if (!config[field]) {
        Logger.log(`❌ Lỗi: Thiếu cấu hình ${field}. Vui lòng kiểm tra file folder.gs`);
        return false;
      }

      if (config[field].includes('YOUR_')) {
        Logger.log(`❌ Lỗi: ${field} chưa được cấu hình. Vui lòng cập nhật URL trong file folder.gs`);
        Logger.log(`💡 Hướng dẫn: Mở file folder.gs và thay thế URL placeholder bằng URL thực tế`);
        return false;
      }
    }

    // Validate folder access nếu có function validateFolderAccess
    try {
      validateFolderAccess();
      Logger.log("✅ Validation folder access thành công");
    } catch (error) {
      Logger.log("❌ Lỗi validation folder access: " + error.toString());
      return false;
    }

    Logger.log("🎉 Validation cấu hình hoàn thành - Tất cả đều hợp lệ!");
    return true;

  } catch (error) {
    Logger.log("💥 Lỗi trong quá trình validate cấu hình: " + error.toString());
    return false;
  }
}
