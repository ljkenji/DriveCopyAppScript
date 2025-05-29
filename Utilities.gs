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
 * Setup trigger tự động chạy main function mỗi 7 phút
 */
function setupAutoTrigger() {
  try {
    const config = getConfig();

    // Kiểm tra xem đã có trigger chưa
    const existingTriggers = ScriptApp.getProjectTriggers();
    const mainTriggers = existingTriggers.filter(trigger =>
      trigger.getHandlerFunction() === 'main'
    );

    if (mainTriggers.length > 0) {
      Logger.log("⚠️ Trigger tự động đã tồn tại, bỏ qua việc tạo mới");
      return mainTriggers[0];
    }

    // Tạo trigger mới với khoảng thời gian từ config
    const intervalMinutes = config.AUTO_TRIGGER_INTERVAL_MINUTES || 7;
    const trigger = ScriptApp.newTrigger('main')
      .timeBased()
      .everyMinutes(intervalMinutes)
      .create();

    // Lưu thời gian tạo trigger để theo dõi timeout
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty('TRIGGER_CREATED_TIME', new Date().getTime().toString());

    Logger.log("✅ Đã tạo trigger tự động chạy mỗi " + intervalMinutes + " phút - ID: " + trigger.getUniqueId());
    Logger.log("🔄 Script sẽ tự động chạy lại sau " + intervalMinutes + " phút nếu chưa hoàn thành");
    Logger.log("📝 Đã lưu thời gian tạo trigger để theo dõi timeout");

    return trigger;

  } catch (error) {
    Logger.log("❌ Lỗi khi tạo trigger tự động: " + error.toString());
    throw error;
  }
}

/**
 * Setup trigger tự động - DEPRECATED, sử dụng setupAutoTrigger() thay thế
 */
function setupTrigger() {
  Logger.log("⚠️ setupTrigger() đã deprecated, sử dụng setupAutoTrigger()");
  return setupAutoTrigger();
}

/**
 * Xóa trigger tự động cho main function
 */
function deleteAutoTrigger() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const mainTriggers = triggers.filter(trigger =>
      trigger.getHandlerFunction() === 'main'
    );

    if (mainTriggers.length === 0) {
      Logger.log("ℹ️ Không tìm thấy trigger tự động nào để xóa");
      return;
    }

    let deletedCount = 0;
    mainTriggers.forEach(trigger => {
      try {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        Logger.log("🗑️ Đã xóa trigger tự động - ID: " + trigger.getUniqueId());
      } catch (error) {
        Logger.log("❌ Lỗi khi xóa trigger " + trigger.getUniqueId() + ": " + error.toString());
      }
    });

    // Xóa thời gian tạo trigger đã lưu
    if (deletedCount > 0) {
      const properties = PropertiesService.getScriptProperties();
      properties.deleteProperty('TRIGGER_CREATED_TIME');
      Logger.log("🧹 Đã xóa thời gian tạo trigger đã lưu");
    }

    Logger.log("✅ Đã xóa " + deletedCount + " trigger tự động thành công");
    Logger.log("🛑 Quá trình copy đã hoàn thành, trigger đã được dọn dẹp");

  } catch (error) {
    Logger.log("❌ Lỗi khi xóa trigger tự động: " + error.toString());
    throw error;
  }
}

/**
 * Xóa tất cả triggers - DEPRECATED, sử dụng deleteAutoTrigger() thay thế
 */
function deleteTrigger() {
  Logger.log("⚠️ deleteTrigger() đã deprecated, sử dụng deleteAutoTrigger()");
  return deleteAutoTrigger();
}

/**
 * Kiểm tra trạng thái trigger tự động
 * @return {Object} Thông tin về trigger {exists, count, triggerIds}
 */
function checkAutoTriggerStatus() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const mainTriggers = triggers.filter(trigger =>
      trigger.getHandlerFunction() === 'main'
    );

    const triggerIds = mainTriggers.map(trigger => trigger.getUniqueId());

    const status = {
      exists: mainTriggers.length > 0,
      count: mainTriggers.length,
      triggerIds: triggerIds
    };

    Logger.log("📊 Trạng thái trigger: " + (status.exists ? "Đang hoạt động" : "Không có") +
      " (" + status.count + " trigger)");

    return status;

  } catch (error) {
    Logger.log("❌ Lỗi khi kiểm tra trạng thái trigger: " + error.toString());
    return {
      exists: false,
      count: 0,
      triggerIds: [],
      error: error.toString()
    };
  }
}

/**
 * Làm sạch tất cả triggers cũ và tạo trigger mới
 */
function resetAutoTrigger() {
  try {
    Logger.log("🔄 Bắt đầu reset trigger tự động...");

    // Xóa tất cả triggers cũ
    deleteAutoTrigger();

    // Đợi một chút để đảm bảo triggers đã được xóa
    Utilities.sleep(1000);

    // Tạo trigger mới
    const newTrigger = setupAutoTrigger();

    Logger.log("✅ Đã reset trigger tự động thành công - ID mới: " + newTrigger.getUniqueId());

    return newTrigger;

  } catch (error) {
    Logger.log("❌ Lỗi khi reset trigger tự động: " + error.toString());
    throw error;
  }
}

/**
 * Kiểm tra và xóa trigger nếu đã chạy quá lâu (safety mechanism)
 */
function checkTriggerTimeout() {
  try {
    const config = getConfig();
    const maxRuntimeHours = config.AUTO_TRIGGER_MAX_RUNTIME_HOURS || 6;
    const maxRuntimeMs = maxRuntimeHours * 60 * 60 * 1000; // Convert to milliseconds

    const triggers = ScriptApp.getProjectTriggers();
    const mainTriggers = triggers.filter(trigger =>
      trigger.getHandlerFunction() === 'main'
    );

    if (mainTriggers.length === 0) {
      return false; // Không có trigger nào
    }

    // Lấy thời gian tạo trigger (ước tính từ thời gian hiện tại)
    // Note: Google Apps Script không cung cấp thời gian tạo trigger trực tiếp
    // Chúng ta sẽ sử dụng PropertiesService để lưu thời gian tạo
    const properties = PropertiesService.getScriptProperties();
    const triggerCreatedTime = properties.getProperty('TRIGGER_CREATED_TIME');

    if (!triggerCreatedTime) {
      // Nếu không có thời gian tạo, lưu thời gian hiện tại
      properties.setProperty('TRIGGER_CREATED_TIME', new Date().getTime().toString());
      Logger.log("📝 Đã lưu thời gian tạo trigger để theo dõi timeout");
      return false;
    }

    const createdTime = parseInt(triggerCreatedTime);
    const currentTime = new Date().getTime();
    const runtimeMs = currentTime - createdTime;

    if (runtimeMs > maxRuntimeMs) {
      Logger.log("⚠️ Trigger đã chạy quá " + maxRuntimeHours + " giờ, tự động xóa để tránh lặp vô hạn");
      Logger.log("🕐 Thời gian chạy: " + Math.round(runtimeMs / (60 * 60 * 1000)) + " giờ");

      // Xóa trigger và properties
      deleteAutoTrigger();
      properties.deleteProperty('TRIGGER_CREATED_TIME');

      // Gửi email thông báo timeout
      if (config.SEND_ERROR_EMAIL) {
        sendMail("Trigger tự động đã bị xóa do chạy quá " + maxRuntimeHours + " giờ. Vui lòng kiểm tra và chạy lại script manually.");
      }

      return true; // Đã xóa trigger do timeout
    }

    Logger.log("⏰ Trigger đang hoạt động bình thường - Thời gian chạy: " +
      Math.round(runtimeMs / (60 * 1000)) + " phút");
    return false;

  } catch (error) {
    Logger.log("❌ Lỗi khi kiểm tra timeout trigger: " + error.toString());
    return false;
  }
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

      <div style="background-color: #e8f5e8; border: 1px solid #4CAF50; padding: 15px; border-radius: 5px; margin-top: 15px;">
        <h3>🔄 Thông tin trigger tự động:</h3>
        <p style="margin: 5px 0;">✅ Trigger tự động đã được xóa thành công sau khi hoàn thành copy</p>
        <p style="margin: 5px 0;">🛑 Không cần chạy lại script - Quá trình đã hoàn thành</p>
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
 * Hiển thị thông tin tổng quan về hệ thống trigger tự động
 */
function showTriggerSystemInfo() {
  try {
    Logger.log("📋 THÔNG TIN HỆ THỐNG TRIGGER TỰ ĐỘNG");
    Logger.log("=" * 50);

    const config = getConfig();

    // Thông tin cấu hình
    Logger.log("⚙️ CẤU HÌNH:");
    Logger.log("   - Khoảng thời gian chạy: " + (config.AUTO_TRIGGER_INTERVAL_MINUTES || 7) + " phút");
    Logger.log("   - Thời gian timeout tối đa: " + (config.AUTO_TRIGGER_MAX_RUNTIME_HOURS || 6) + " giờ");
    Logger.log("   - Tự động tạo trigger: " + (config.AUTO_CREATE_TRIGGER ? "BẬT" : "TẮT"));
    Logger.log("   - Tự động xóa trigger: " + (config.AUTO_DELETE_TRIGGER ? "BẬT" : "TẮT"));

    // Trạng thái hiện tại
    Logger.log("\n📊 TRẠNG THÁI HIỆN TẠI:");
    const status = checkAutoTriggerStatus();
    Logger.log("   - Có trigger đang hoạt động: " + (status.exists ? "CÓ" : "KHÔNG"));
    Logger.log("   - Số lượng trigger: " + status.count);

    if (status.exists) {
      Logger.log("   - IDs trigger: " + JSON.stringify(status.triggerIds));

      // Kiểm tra thời gian chạy
      const properties = PropertiesService.getScriptProperties();
      const triggerCreatedTime = properties.getProperty('TRIGGER_CREATED_TIME');

      if (triggerCreatedTime) {
        const createdTime = parseInt(triggerCreatedTime);
        const currentTime = new Date().getTime();
        const runtimeMinutes = Math.round((currentTime - createdTime) / (60 * 1000));
        Logger.log("   - Thời gian đã chạy: " + runtimeMinutes + " phút");

        const maxRuntimeHours = config.AUTO_TRIGGER_MAX_RUNTIME_HOURS || 6;
        const maxRuntimeMinutes = maxRuntimeHours * 60;
        const remainingMinutes = maxRuntimeMinutes - runtimeMinutes;

        if (remainingMinutes > 0) {
          Logger.log("   - Thời gian còn lại trước timeout: " + remainingMinutes + " phút");
        } else {
          Logger.log("   - ⚠️ TRIGGER ĐÃ QUÁ THỜI GIAN CHO PHÉP!");
        }
      }
    }

    Logger.log("\n🔧 CÁC LỆNH QUẢN LÝ:");
    Logger.log("   - setupAutoTrigger(): Tạo trigger tự động");
    Logger.log("   - deleteAutoTrigger(): Xóa trigger tự động");
    Logger.log("   - checkAutoTriggerStatus(): Kiểm tra trạng thái");
    Logger.log("   - checkTriggerTimeout(): Kiểm tra timeout");
    Logger.log("   - resetAutoTrigger(): Reset trigger");
    Logger.log("   - testTriggerSystem(): Test toàn bộ hệ thống");

    Logger.log("\n" + "=" * 50);

    return status;

  } catch (error) {
    Logger.log("❌ Lỗi khi hiển thị thông tin trigger system: " + error.toString());
    return null;
  }
}

/**
 * Kiểm tra và test hệ thống trigger tự động
 */
function testTriggerSystem() {
  try {
    Logger.log("🧪 BẮT ĐẦU TEST HỆ THỐNG TRIGGER TỰ ĐỘNG");
    Logger.log("=" * 50);

    // 1. Kiểm tra trạng thái hiện tại
    Logger.log("1️⃣ Kiểm tra trạng thái trigger hiện tại:");
    const currentStatus = checkAutoTriggerStatus();
    Logger.log("   - Có trigger: " + currentStatus.exists);
    Logger.log("   - Số lượng: " + currentStatus.count);
    Logger.log("   - IDs: " + JSON.stringify(currentStatus.triggerIds));

    // 2. Test tạo trigger
    Logger.log("\n2️⃣ Test tạo trigger tự động:");
    const newTrigger = setupAutoTrigger();
    Logger.log("   - Trigger ID: " + newTrigger.getUniqueId());
    Logger.log("   - Handler function: " + newTrigger.getHandlerFunction());

    // 3. Kiểm tra lại trạng thái
    Logger.log("\n3️⃣ Kiểm tra trạng thái sau khi tạo:");
    const afterCreateStatus = checkAutoTriggerStatus();
    Logger.log("   - Có trigger: " + afterCreateStatus.exists);
    Logger.log("   - Số lượng: " + afterCreateStatus.count);

    // 4. Test kiểm tra timeout
    Logger.log("\n4️⃣ Test kiểm tra timeout:");
    const timeoutResult = checkTriggerTimeout();
    Logger.log("   - Trigger bị timeout: " + timeoutResult);

    // 5. Test xóa trigger
    Logger.log("\n5️⃣ Test xóa trigger:");
    deleteAutoTrigger();

    // 6. Kiểm tra trạng thái cuối
    Logger.log("\n6️⃣ Kiểm tra trạng thái sau khi xóa:");
    const finalStatus = checkAutoTriggerStatus();
    Logger.log("   - Có trigger: " + finalStatus.exists);
    Logger.log("   - Số lượng: " + finalStatus.count);

    Logger.log("\n✅ TEST HỆ THỐNG TRIGGER HOÀN THÀNH");
    Logger.log("=" * 50);

    return {
      success: true,
      initialStatus: currentStatus,
      afterCreateStatus: afterCreateStatus,
      finalStatus: finalStatus,
      timeoutResult: timeoutResult
    };

  } catch (error) {
    Logger.log("❌ Lỗi trong test trigger system: " + error.toString());
    return {
      success: false,
      error: error.toString()
    };
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
