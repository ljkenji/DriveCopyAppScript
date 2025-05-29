/*
 * File cấu hình folder cho DriveCopyAppScript
 * Author: Lj Kenji FB: https://fb.com/lj.kenji
 *
 // ==================== CẤU HÌNH FOLDER ====================

/**
 * 📁 URL FOLDER NGUỒN (Source)
 * Đây là folder chứa dữ liệu bạn muốn copy.
 */
const SOURCE_URL = "https://drive.google.com/drive/folders/YOUR_SOURCE_FOLDER_ID_HERE";

/**
 * 📁 URL FOLDER ĐÍCH (Destination)
 * Đây là folder nơi dữ liệu sẽ được copy đến.
 */
const DESTINATION_URL = "https://drive.google.com/drive/folders/YOUR_DESTINATION_FOLDER_ID_HERE";

/*
 * ==================== HƯỚNG DẪN SỬ DỤNG ====================
 *
 * File này chứa cấu hình đường dẫn folder nguồn và folder đích.
 * Bạn chỉ cần thay đổi 2 URL bên dưới để sử dụng script.
 *
 * ==================== CÁCH LẤY URL FOLDER GOOGLE DRIVE ====================
 *
 * Bước 1: Mở Google Drive (https://drive.google.com)
 * Bước 2: Tìm và mở folder bạn muốn sử dụng
 * Bước 3: Copy URL từ thanh địa chỉ trình duyệt
 * Bước 4: Paste URL vào biến tương ứng bên dưới
 *
 * ⚠️  LƯU Ý QUAN TRỌNG:
 * - URL phải có định dạng: https://drive.google.com/drive/folders/FOLDER_ID
 * - FOLDER_ID là chuỗi ký tự dài khoảng 33 ký tự
 * - Đảm bảo bạn có quyền truy cập vào cả 2 folder
 * - Folder đích có thể trống, script sẽ tự động tạo nội dung
 *
 * ==================== VÍ DỤ URL ĐÚNG ĐỊNH DẠNG ====================
 *
 * ✅ ĐÚNG: https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OlympiaKo
 * ✅ ĐÚNG: https://drive.google.com/drive/folders/1234567890abcdefghijklmnopqrstuvwxyz
 *
 * ❌ SAI: https://drive.google.com/drive/u/0/folders/1234567890abcdefghijklmnopqrstuvwxyz
 * ❌ SAI: https://drive.google.com/open?id=1234567890abcdefghijklmnopqrstuvwxyz
 * ❌ SAI: https://docs.google.com/...
 *
 * ==================== KIỂM TRA QUYỀN TRUY CẬP ====================
 *
 * Để đảm bảo script hoạt động:
 * 1. Bạn phải là chủ sở hữu hoặc có quyền chỉnh sửa folder nguồn
 * 2. Bạn phải có quyền tạo file/folder trong folder đích
 * 3. Nếu folder là "Shared with me", hãy thêm vào "My Drive" trước
 *
 * ==================== TROUBLESHOOTING ====================
 *
 * Nếu gặp lỗi "Folder not found":
 * - Kiểm tra URL có đúng định dạng không
 * - Kiểm tra quyền truy cập folder
 * - Thử mở URL trong trình duyệt để xác nhận
 *
 * Nếu gặp lỗi "Permission denied":
 * - Đảm bảo bạn đã đăng nhập đúng tài khoản Google
 * - Kiểm tra quyền chia sẻ của folder
 * - Liên hệ chủ sở hữu folder để cấp quyền
 */


// ==================== CACHING SYSTEM ====================

/**
 * Biến global để cache folder config trong phạm vi execution hiện tại
 * Cache sẽ được clear tự động khi execution kết thúc
 */
var _folderConfigCache = null;
var _cacheTimestamp = null;

// ==================== FUNCTIONS ====================

/**
 * Clear cache folder config (sử dụng khi cần reset)
 */
function clearFolderConfigCache() {
  _folderConfigCache = null;
  _cacheTimestamp = null;
  Logger.log("🧹 Đã clear cache folder config");
}

/**
 * Hiển thị thông tin cache folder config (dùng để debug khi cần)
 */
function showFolderConfigCacheInfo() {
  try {
    Logger.log("📊 THÔNG TIN CACHE FOLDER CONFIG");
    Logger.log("=" * 40);

    if (_folderConfigCache === null) {
      Logger.log("💾 Cache status: EMPTY (chưa có cache)");
      Logger.log("⏰ Cache timestamp: N/A");
      Logger.log("ℹ️ Cache sẽ được tạo khi gọi getFolderConfig() lần đầu");
    } else {
      Logger.log("💾 Cache status: ACTIVE (có cache)");
      Logger.log("⏰ Cache timestamp: " + new Date(_cacheTimestamp).toLocaleString());

      const currentTime = new Date().getTime();
      const cacheAge = Math.round((currentTime - _cacheTimestamp) / 1000);
      Logger.log("🕐 Cache age: " + cacheAge + " giây");

      Logger.log("📁 Cached URLs:");
      Logger.log("   - SOURCE: " + (_folderConfigCache.SOURCE_FOLDER_URL || "N/A"));
      Logger.log("   - DESTINATION: " + (_folderConfigCache.DESTINATION_FOLDER_URL || "N/A"));
      Logger.log("🚀 Các lần gọi getFolderConfig() tiếp theo sẽ sử dụng cache (im lặng)");
    }

    Logger.log("=" * 40);

    return {
      hasCache: _folderConfigCache !== null,
      timestamp: _cacheTimestamp,
      cacheAge: _cacheTimestamp ? Math.round((new Date().getTime() - _cacheTimestamp) / 1000) : null
    };

  } catch (error) {
    Logger.log("❌ Lỗi khi hiển thị cache info: " + error.toString());
    return null;
  }
}

/**
 * Lấy cấu hình folder URLs với caching mechanism
 * @return {Object} Object chứa SOURCE_URL và DESTINATION_URL
 */
function getFolderConfig() {
  try {
    // Kiểm tra cache trước
    if (_folderConfigCache !== null) {
      // Sử dụng cache im lặng, không log để giảm noise
      return _folderConfigCache;
    }

    Logger.log("📁 Load cấu hình folder từ file folder.gs (lần đầu trong execution)");

    // Validate URLs trước khi return
    if (!SOURCE_URL || SOURCE_URL.includes("YOUR_SOURCE_FOLDER_ID_HERE")) {
      throw new Error("❌ SOURCE_URL chưa được cấu hình. Vui lòng cập nhật URL folder nguồn trong file folder.gs");
    }

    if (!DESTINATION_URL || DESTINATION_URL.includes("YOUR_DESTINATION_FOLDER_ID_HERE")) {
      throw new Error("❌ DESTINATION_URL chưa được cấu hình. Vui lòng cập nhật URL folder đích trong file folder.gs");
    }

    // Validate URL format
    const urlPattern = /^https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]+$/;

    if (!urlPattern.test(SOURCE_URL)) {
      throw new Error("❌ SOURCE_URL không đúng định dạng. Định dạng đúng: https://drive.google.com/drive/folders/FOLDER_ID");
    }

    if (!urlPattern.test(DESTINATION_URL)) {
      throw new Error("❌ DESTINATION_URL không đúng định dạng. Định dạng đúng: https://drive.google.com/drive/folders/FOLDER_ID");
    }

    // Tạo config object
    const configObject = {
      SOURCE_FOLDER_URL: SOURCE_URL,      // Giữ tên cũ để tương thích
      DESTINATION_FOLDER_URL: DESTINATION_URL  // Giữ tên cũ để tương thích
    };

    // Lưu vào cache
    _folderConfigCache = configObject;
    _cacheTimestamp = new Date().getTime();

    Logger.log("✅ Đã load và cache cấu hình folder thành công từ folder.gs");
    Logger.log("💾 Cache sẽ được sử dụng cho các lần gọi tiếp theo trong execution này");

    return configObject;

  } catch (error) {
    Logger.log("💥 Lỗi khi load cấu hình folder: " + error.toString());
    // Clear cache khi có lỗi
    clearFolderConfigCache();
    throw error;
  }
}

/**
 * Validate folder URLs và quyền truy cập
 * @return {boolean} True nếu tất cả folder đều hợp lệ
 */
function validateFolderAccess() {
  try {
    Logger.log("🔍 Bắt đầu kiểm tra quyền truy cập folder...");

    // Sử dụng getFolderConfig() với caching
    const folderConfig = getFolderConfig();

    // Extract folder IDs
    const sourceId = folderConfig.SOURCE_FOLDER_URL.split('/folders/')[1];
    const destId = folderConfig.DESTINATION_FOLDER_URL.split('/folders/')[1];

    // Test access to source folder
    try {
      const sourceFolder = DriveApp.getFolderById(sourceId);
      const sourceName = sourceFolder.getName();
      Logger.log("✅ Folder nguồn OK: " + sourceName);
    } catch (error) {
      throw new Error("❌ Không thể truy cập folder nguồn. Kiểm tra URL và quyền truy cập: " + error.toString());
    }

    // Test access to destination folder
    try {
      const destFolder = DriveApp.getFolderById(destId);
      const destName = destFolder.getName();
      Logger.log("✅ Folder đích OK: " + destName);
    } catch (error) {
      throw new Error("❌ Không thể truy cập folder đích. Kiểm tra URL và quyền truy cập: " + error.toString());
    }

    Logger.log("🎉 Tất cả folder đều hợp lệ và có thể truy cập!");
    return true;

  } catch (error) {
    Logger.log("💥 Lỗi validation folder: " + error.toString());
    throw error;
  }
}
