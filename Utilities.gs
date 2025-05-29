/*
 * Utilities - Tích hợp các utility functions cho DriveCopyAppScript v1.0
 * Author: Lj Kenji - https://fb.com/lj.kenji
 */

/**
 * Lấy thời gian hiện tại (tối ưu hóa)
 * @return {string} Thời gian định dạng yyyy-MM-dd HH:mm:ss
 */
function getTimeNow() {
  const now = new Date();
  const timezone = "GMT+" + (-now.getTimezoneOffset() / 60);
  return Utilities.formatDate(now, timezone, "yyyy-MM-dd HH:mm:ss");
}

/**
 * Setup trigger tự động - DISABLED for manual execution mode
 */
function setupTrigger() {
  Logger.log("⚠️ Tạo trigger tự động đã BỊ TẮT - Chỉ chế độ thực thi thủ công");
  // Auto trigger creation has been disabled per user preference
  // Script should be run manually from Google Apps Script interface
}

/**
 * Xóa tất cả triggers
 */
function deleteTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  Logger.log("🗑️ Đã xóa tất cả triggers");
}

/**
 * Gửi email thông báo lỗi
 * @param {string} bug - Nội dung lỗi
 */
function sendMail(bug) {
  const config = getConfig();
  const scriptURL = 'https://script.google.com/macros/d/' + ScriptApp.getScriptId() + '/edit';
  const email = Session.getActiveUser().getEmail();
  const header = config.EMAIL_ERROR_SUBJECT;
  const body = `
    <p style="font-size:20px;">
      Chào bạn,<br><br>
      Đã có lỗi trong quá trình Copy. Vui lòng liên hệ với tôi bằng cách tạo issue
      <a href="${config.GITHUB_ISSUE_URL}">tại đây</a> và báo lỗi bên dưới:<br><br>
      ${bug}<br><br>
      <a style="color:red;">Script đã tắt tính năng auto resume. Bạn vui lòng chạy lại script lần nữa để kích hoạt lại tính năng auto resume</a>.
      Bạn có thể truy cập script nhanh <a href="${scriptURL}">tại đây</a>.<br><br>
      Thân,<br><br>
      ${config.TOOL_NAME}.
    </p>
  `;

  try {
    MailApp.sendEmail({
      to: email,
      subject: header,
      htmlBody: body
    });
    Logger.log("📧 Đã gửi email thông báo lỗi");
  } catch (error) {
    Logger.log("❌ Lỗi khi gửi email: " + error.toString());
  }
}

/**
 * Gửi email thông báo hoàn thành
 * @param {string} link - Link đến folder đã copy
 */
function sendEmailComplete(link) {
  const config = getConfig();
  const email = Session.getActiveUser().getEmail();
  const header = config.EMAIL_SUCCESS_SUBJECT;
  const body = `
    <p style="font-size:20px;">
      Chào bạn,<br><br>
      Quá trình Copy đã hoàn thành thành công!<br><br>
      Bạn có thể truy cập folder đã copy <a href="${link}">tại đây</a>.<br><br>
      Thân,<br><br>
      ${config.TOOL_NAME}.
    </p>
  `;

  try {
    MailApp.sendEmail({
      to: email,
      subject: header,
      htmlBody: body
    });
    Logger.log("📧 Đã gửi email thông báo hoàn thành");
  } catch (error) {
    Logger.log("❌ Lỗi khi gửi email: " + error.toString());
  }
}

/**
 * Gửi email hoàn thành với báo cáo chi tiết
 * @param {string} link - Link đến folder đã copy
 * @param {string} report - Báo cáo chi tiết
 */
function sendEmailCompleteWithReport(link, report) {
  const config = getConfig();
  const email = Session.getActiveUser().getEmail();
  const header = config.EMAIL_SUCCESS_SUBJECT + " - Báo cáo chi tiết";

  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 800px;">
      <h2 style="color: #4CAF50;">✅ Copy hoàn thành thành công!</h2>

      <p style="font-size: 16px;">
        Chào bạn,<br><br>
        Quá trình Copy đã hoàn thành thành công với báo cáo chi tiết bên dưới.
      </p>

      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>🔗 Truy cập folder đã copy:</h3>
        <a href="${link}" style="color: #2196F3; font-size: 16px;">${link}</a>
      </div>

      <div style="background-color: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px;">
        <h3>📊 Báo cáo chi tiết:</h3>
        <pre style="background-color: #f8f8f8; padding: 15px; border-radius: 3px; overflow-x: auto; font-size: 12px;">${report}</pre>
      </div>

      <p style="margin-top: 30px; color: #666;">
        Thân,<br>
        <strong>${config.TOOL_NAME}</strong>
      </p>
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: email,
      subject: header,
      htmlBody: body
    });
    Logger.log("📧 Đã gửi email báo cáo hoàn thành");
  } catch (error) {
    Logger.log("❌ Lỗi khi gửi email báo cáo: " + error.toString());
  }
}

/**
 * Setup auto resume system - DISABLED for manual execution mode
 * @param {Folder} folder - Folder đích
 */
function setupAutoResume(folder) {
  Logger.log("⚠️ Auto resume system is DISABLED - Manual execution mode only");
  // Auto resume has been disabled per user preference
  // No marker files or triggers will be created
  // Script should be run manually when needed
}

/**
 * Kiểm tra trạng thái auto resume
 * @param {Folder} folder - Folder chứa marker files
 * @return {number} 0 nếu tắt, 1 nếu bật
 */
function getStatusAutoResume(folder) {
  const config = getConfig();
  const triggerExist = ScriptApp.getProjectTriggers().length;
  const onAutoResumeFile = folder.getFilesByName(config.AUTO_RESUME_ON_MARKER);

  if (onAutoResumeFile.hasNext()) {
    // Nếu có file "on" nhưng không có trigger thì coi như tắt
    return triggerExist > 0 ? 1 : 0;
  }

  // Không có file "on" thì xóa trigger và return 0
  if (triggerExist > 0) {
    deleteTrigger();
  }
  return 0;
}

/**
 * Setup auto resume và trigger - DISABLED for manual execution mode
 * @param {Folder} targetFolder - Folder đích
 */
function setupAutoResumeAndTrigger(targetFolder) {
  Logger.log("⚠️ Auto resume and trigger system is DISABLED - Manual execution mode only");
  // Auto resume and trigger creation has been disabled per user preference
  // Script should be run manually from Google Apps Script interface
  // No marker files or triggers will be created
}

/**
 * Cleanup và gửi thông báo hoàn thành - SIMPLIFIED for manual execution mode
 * @param {Folder} targetFolder - Folder đích
 * @param {string} report - Báo cáo chi tiết
 */
function cleanupAndNotify(targetFolder, report) {
  const config = getConfig();

  try {
    Logger.log("🧹 Bắt đầu cleanup (manual execution mode)...");

    // No marker files to clean up in manual execution mode
    // No triggers to delete in manual execution mode

    // Cleanup performance engine
    const performanceEngine = getPerformanceEngine();
    performanceEngine.cleanup();

    // Gửi email thông báo hoàn thành
    if (config.SEND_COMPLETION_EMAIL) {
      const folderUrl = targetFolder.getUrl();
      sendEmailCompleteWithReport(folderUrl, report);
    }

    Logger.log("✅ Cleanup hoàn thành (manual execution mode)");

  } catch (error) {
    Logger.log("❌ Lỗi trong quá trình cleanup: " + error.toString());

    // Vẫn cố gắng gửi email thông báo lỗi
    if (config.SEND_ERROR_EMAIL) {
      sendMail("Lỗi trong cleanup: " + error.toString());
    }
  }
}

/**
 * Format file size thành string dễ đọc
 * @param {number} bytes - Kích thước file tính bằng bytes
 * @return {string} Kích thước đã format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Tạo progress bar text
 * @param {number} percentage - Phần trăm hoàn thành
 * @return {string} Progress bar string
 */
function generateProgressBar(percentage) {
  const barLength = 30;
  const filledLength = Math.round((percentage / 100) * barLength);
  const emptyLength = barLength - filledLength;

  const filledBar = '█'.repeat(filledLength);
  const emptyBar = '░'.repeat(emptyLength);

  return `[${filledBar}${emptyBar}] ${percentage}%`;
}

/**
 * Validate URL format và trích xuất folder ID
 * @param {string} url - Google Drive folder URL
 * @return {string|null} Folder ID hoặc null nếu không hợp lệ
 */
function extractFolderIdFromUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const match = url.match(/(?<=folders\/)([a-zA-Z0-9_-]+)(?=\?|$)/);
  return match ? match[0] : null;
}

/**
 * Kiểm tra quyền truy cập folder
 * @param {string} folderId - ID của folder
 * @return {boolean} True nếu có quyền truy cập
 */
function checkFolderAccess(folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    folder.getName(); // Test access
    return true;
  } catch (error) {
    Logger.log(`❌ Không thể truy cập folder ${folderId}: ${error.toString()}`);
    return false;
  }
}

/**
 * Tạo backup của cấu hình hiện tại
 * @return {Object} Backup object
 */
function createConfigBackup() {
  const config = getConfig();
  const backup = {
    timestamp: new Date(),
    config: JSON.parse(JSON.stringify(config)),
    scriptId: ScriptApp.getScriptId(),
    userEmail: Session.getActiveUser().getEmail()
  };

  Logger.log("💾 Đã tạo backup cấu hình");
  return backup;
}

/**
 * Log thông tin hệ thống để debug
 */
function logSystemInfo() {
  try {
    Logger.log("🔍 THÔNG TIN HỆ THỐNG:");
    Logger.log("- ID Script: " + ScriptApp.getScriptId());
    Logger.log("- Người dùng: " + Session.getActiveUser().getEmail());
    Logger.log("- Múi giờ: " + Session.getScriptTimeZone());
    Logger.log("- Triggers: " + ScriptApp.getProjectTriggers().length);

    const config = getConfig();
    Logger.log("- Chế độ hiệu suất: " + (config.PERFORMANCE_MODE || 'MẶC ĐỊNH'));
    Logger.log("- Số file tối đa mỗi lần chạy: " + config.MAX_FILES_PER_RUN);

  } catch (error) {
    Logger.log("❌ Lỗi khi log system info: " + error.toString());
  }
}

/**
 * Retry function với exponential backoff
 * @param {Function} fn - Function cần retry
 * @param {number} maxRetries - Số lần retry tối đa
 * @param {number} baseDelay - Delay cơ bản (ms)
 * @return {*} Kết quả của function
 */
function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        Logger.log(`⚠️ Thử lại ${attempt + 1}/${maxRetries} sau ${delay}ms`);
        Utilities.sleep(delay);
      }
    }
  }

  throw new Error(`Function failed after ${maxRetries} attempts: ${lastError.toString()}`);
}

/**
 * Kiểm tra và tạo folder nếu chưa tồn tại
 * @param {string} folderName - Tên folder
 * @param {Folder} parentFolder - Folder cha
 * @return {Folder} Folder đã tạo hoặc đã tồn tại
 */
function getOrCreateFolder(folderName, parentFolder) {
  const existingFolders = parentFolder.getFoldersByName(folderName);

  if (existingFolders.hasNext()) {
    return existingFolders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}
