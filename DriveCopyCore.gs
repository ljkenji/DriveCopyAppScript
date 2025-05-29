/*
 * DriveCopyCore - Core engine tích hợp cho DriveCopyAppScript v1.0
 * Author: Lj Kenji - https://fb.com/lj.kenji
 */

/**
 * Validate configuration
 * @return {boolean} True if config is valid
 */
function validateConfig() {
  try {
    const config = getConfig();

    if (!config) {
      Logger.log("❌ Config object is null or undefined");
      return false;
    }

    if (!config.SOURCE_FOLDER_URL || !config.DESTINATION_FOLDER_URL) {
      Logger.log("❌ SOURCE_FOLDER_URL hoặc DESTINATION_FOLDER_URL không được cấu hình");
      return false;
    }

    return true;
  } catch (error) {
    Logger.log("❌ Lỗi khi validate config: " + error.toString());
    return false;
  }
}

/**
 * Hàm chính để bắt đầu quá trình copy (tối ưu hóa error handling)
 * Sử dụng cấu hình từ file config.gs
 */
function main() {
  try {
    // Log system info for debugging
    logSystemInfo();

    // Validate cấu hình trước khi bắt đầu
    if (!validateConfig()) {
      Logger.log("❌ Cấu hình không hợp lệ. Vui lòng kiểm tra file config.gs");
      return;
    }

    const config = getConfig();
    const src = config.SOURCE_FOLDER_URL;
    const des = config.DESTINATION_FOLDER_URL;

    // Validate URL format và trích xuất folder ID
    const sourceFolderId = extractFolderIdFromUrl(src);
    const destFolderId = extractFolderIdFromUrl(des);

    if (!sourceFolderId || !destFolderId) {
      throw new Error("URL folder không hợp lệ. Vui lòng kiểm tra SOURCE_FOLDER_URL và DESTINATION_FOLDER_URL trong config.gs");
    }

    // Kiểm tra quyền truy cập
    if (!checkFolderAccess(sourceFolderId) || !checkFolderAccess(destFolderId)) {
      throw new Error("Không có quyền truy cập một hoặc cả hai folder. Vui lòng kiểm tra quyền truy cập.");
    }

    Logger.log("🚀 Bắt đầu copy từ folder: " + sourceFolderId + " đến folder: " + destFolderId);
    start(sourceFolderId, destFolderId);

  } catch (error) {
    Logger.log("💥 Lỗi trong main(): " + error.toString());

    // Gửi email thông báo lỗi cấu hình
    const config = getConfig();
    if (config && config.SEND_ERROR_EMAIL) {
      sendMail("Lỗi cấu hình trong main(): " + error.toString());
    }
    throw error;
  }
}

/**
 * Preprocess the copy with new tracking system (tối ưu hóa)
 * @param {string} sourceFolderID - ID folder nguồn
 * @param {string} targetFolder - ID folder đích
 */
function start(sourceFolderID, targetFolder) {
  const config = getConfig();
  let source, target, actualTargetFolderId;

  try {
    // Validate và lấy folder nguồn
    source = DriveApp.getFolderById(sourceFolderID);
    const sourceName = source.getName();
    Logger.log("📁 Folder nguồn: " + sourceName);

    // Xử lý folder đích
    if (!targetFolder || targetFolder === "") {
      Logger.log("📁 Tạo folder mới: " + sourceName);
      const newFolderName = config.NEW_COPY_PREFIX + sourceName;
      target = DriveApp.createFolder(newFolderName);
      actualTargetFolderId = target.getId();
    } else {
      Logger.log("📁 Sử dụng folder đích có sẵn");
      target = DriveApp.getFolderById(targetFolder);
      actualTargetFolderId = targetFolder;
    }

    // Thực hiện copy với tracking system (manual execution only)
    performCopyWithTracking(sourceFolderID, actualTargetFolderId, target);

  } catch (error) {
    Logger.log("💥 Lỗi trong start(): " + error.toString());

    // Gửi email lỗi (no auto-resume cleanup needed)
    if (config.SEND_ERROR_EMAIL) {
      sendMail("Lỗi trong start(): " + error.toString());
    }
    throw error;
  }
}

/**
 * Thực hiện copy với tracking system tích hợp
 * @param {string} sourceFolderId - ID folder nguồn
 * @param {string} destFolderId - ID folder đích
 * @param {Folder} targetFolder - Folder object đích
 */
function performCopyWithTracking(sourceFolderId, destFolderId, targetFolder) {
  const config = getConfig();
  const performanceEngine = getPerformanceEngine();

  try {
    Logger.log("🚀 Bắt đầu copy với tracking system tích hợp v1.0");

    // Thực hiện copy với recursive engine
    const copyResult = copyFolderStructureWithTracking(sourceFolderId, destFolderId);

    // Tạo báo cáo chi tiết
    const report = generateCopyReport(copyResult, sourceFolderId, destFolderId);
    const perfReport = performanceEngine.getPerformanceReport();

    if (copyResult.isCompleted) {
      Logger.log("✅ Copy hoàn thành! Tổng: " + copyResult.totalItems +
        ", Thành công: " + copyResult.copiedItems +
        ", Lỗi: " + copyResult.errorItems +
        ", Bỏ qua: " + copyResult.skippedItems);

      // Gửi email thông báo hoàn thành (manual execution mode)
      if (config.SEND_COMPLETION_EMAIL) {
        const folderUrl = targetFolder.getUrl();
        sendEmailCompleteWithReport(folderUrl, report + "\n\n" + perfReport);
      }

      // Cleanup performance engine
      const performanceEngine = getPerformanceEngine();
      performanceEngine.cleanup();

      Logger.log("✅ Quá trình copy hoàn thành - Chế độ thực thi thủ công");
    } else {
      Logger.log("⏳ Copy chưa hoàn thành. Tiến độ: " +
        copyResult.copiedItems + "/" + copyResult.totalItems + " item");
      Logger.log("🔄 Chạy lại script manually để tiếp tục");
    }

  } catch (error) {
    Logger.log("💥 Lỗi trong performCopyWithTracking(): " + error.toString());

    // Gửi email thông báo lỗi
    if (config.SEND_ERROR_EMAIL) {
      sendMail("Lỗi trong copy process: " + error.toString());
    }
    throw error;
  }
}

/**
 * Copy toàn bộ cấu trúc folder với tracking đầy đủ (SPEED OPTIMIZED v1.0)
 * @param {string} sourceFolderId - ID folder nguồn
 * @param {string} destFolderId - ID folder đích
 * @return {Object} Kết quả copy {totalItems, copiedItems, errorItems, skippedItems, isCompleted}
 */
function copyFolderStructureWithTracking(sourceFolderId, destFolderId) {
  const config = getConfig();
  const performanceEngine = getPerformanceEngine();
  const startTime = new Date();

  try {
    Logger.log("🚀 Bắt đầu quá trình copy TỐI ƯU TỐC ĐỘ v1.0");

    // Lấy hoặc tạo tracking sheet
    const trackingResult = getOrCreateTrackingSheet(sourceFolderId, destFolderId);
    const { spreadsheet, sheet, isNew } = trackingResult;

    Logger.log("📊 Tracking sheet: " + spreadsheet.getName() + (isNew ? " (mới tạo)" : " (đã tồn tại)"));

    // Tăng số lần chạy script (chỉ cho sheet đã tồn tại)
    if (!isNew) {
      incrementRunCount(sheet, performanceEngine);
    }

    // Speed-enhanced folder scanning
    const newItemsCount = speedOptimizedScanAndUpdate(sourceFolderId, sheet, performanceEngine);
    Logger.log("📁 Đã cập nhật tracking sheet với " + newItemsCount + " item mới (SPEED OPTIMIZED)");

    // Lấy danh sách item cần copy theo thứ tự tối ưu
    const pendingItems = getPendingItemsOrdered(sheet);
    Logger.log("📋 Tìm thấy " + pendingItems.length + " item cần xử lý");

    if (pendingItems.length === 0) {
      Logger.log("✅ Tất cả item đã được copy");
      return {
        totalItems: getTotalItemsCount(sheet),
        copiedItems: getCompletedItemsCount(sheet),
        errorItems: getErrorItemsCount(sheet),
        skippedItems: 0,
        isCompleted: true
      };
    }

    // Thực hiện copy có cấu trúc với performance optimization
    const copyResult = performStructuredCopy(pendingItems, sourceFolderId, destFolderId, sheet, performanceEngine);

    // Tính toán kết quả cuối cùng
    const totalItems = getTotalItemsCount(sheet);
    const completedItems = getCompletedItemsCount(sheet);
    const isCompleted = completedItems >= totalItems;

    const result = {
      totalItems: totalItems,
      copiedItems: copyResult.copiedItems,
      errorItems: copyResult.errorItems,
      skippedItems: copyResult.skippedItems,
      isCompleted: isCompleted
    };

    const processingTime = new Date() - startTime;
    Logger.log(`⚡ Copy process completed in ${(processingTime / 1000).toFixed(2)} seconds`);

    // Cập nhật số file đã copy sau khi hoàn thành copy
    updateCopiedFileCount(sheet, performanceEngine);

    return result;

  } catch (error) {
    Logger.log("❌ Error in copyFolderStructureWithTracking: " + error.toString());
    throw error;
  }
}

/**
 * Tạo hoặc lấy tracking sheet
 * @param {string} sourceFolderId - ID folder nguồn
 * @param {string} destFolderId - ID folder đích
 * @return {Object} {spreadsheet, sheet, isNew}
 */
function getOrCreateTrackingSheet(sourceFolderId, destFolderId) {
  const config = getConfig();
  const destFolder = DriveApp.getFolderById(destFolderId);

  // Tạo tên file tracking sheet
  const fileName = config.TRACKING_SHEET_NAME_PATTERN
    .replace("{SOURCE_ID}", sourceFolderId)
    .replace("{DEST_ID}", destFolderId) + config.TRACKING_SHEET_EXTENSION;

  Logger.log("🔍 Tìm kiếm tracking sheet: " + fileName);

  // Tìm file tracking sheet đã tồn tại
  const existingFiles = destFolder.getFilesByName(fileName);

  if (existingFiles.hasNext()) {
    const file = existingFiles.next();
    const spreadsheet = SpreadsheetApp.openById(file.getId());
    const sheet = spreadsheet.getActiveSheet();

    Logger.log("📊 Sử dụng tracking sheet đã tồn tại: " + spreadsheet.getUrl());

    // Kiểm tra và khởi tạo metadata cho sheet cũ (backward compatibility)
    const performanceEngine = getPerformanceEngine();
    ensureMetadataExists(sheet, performanceEngine);

    return { spreadsheet, sheet, isNew: false };
  } else {
    return createNewTrackingSheet(fileName, destFolder);
  }
}

/**
 * Tạo Google Sheets tracking mới
 * @param {string} fileName - Tên file
 * @param {Folder} destFolder - Folder đích
 * @return {Object} {spreadsheet, sheet, isNew}
 */
function createNewTrackingSheet(fileName, destFolder) {
  Logger.log("📊 Tạo Google Sheets tracking mới: " + fileName);

  // Tạo Google Sheets mới
  const spreadsheet = SpreadsheetApp.create(fileName);
  const sheet = spreadsheet.getActiveSheet();

  // Đặt tên cho sheet đầu tiên
  sheet.setName("File Tracking");

  // Di chuyển file vào folder đích
  const file = DriveApp.getFileById(spreadsheet.getId());
  file.moveTo(destFolder);

  // Thiết lập headers và format
  setupTrackingSheetHeaders(sheet);

  Logger.log("✅ Đã tạo Google Sheets tracking: " + spreadsheet.getUrl());
  return { spreadsheet, sheet, isNew: true };
}

/**
 * Thiết lập headers cho tracking sheet (hỗ trợ folder structure) - Row 6
 * @param {Sheet} sheet - Google Sheet object
 */
function setupTrackingSheetHeaders(sheet) {
  const config = getConfig();
  const headers = config.TRACKING_HEADERS;
  const headerRow = 6; // Headers ở row 6 (sau metadata rows 1-5)

  // Thêm metadata trước (rows 1-5)
  addMetadataToSheet(sheet);

  // Thiết lập headers ở row 6
  const headerRange = sheet.getRange(headerRow, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // Format headers
  headerRange.setBackground("#4CAF50");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(12);

  // Thêm border cho headers
  headerRange.setBorder(true, true, true, true, true, true, "#FFFFFF", SpreadsheetApp.BorderStyle.SOLID);

  // Thiết lập độ rộng cột tối ưu cho Google Sheets (hỗ trợ folder structure)
  sheet.setColumnWidth(1, 60);   // STT
  sheet.setColumnWidth(2, 250);  // Tên
  sheet.setColumnWidth(3, 80);   // Loại
  sheet.setColumnWidth(4, 100);  // Kích thước
  sheet.setColumnWidth(5, 300);  // Đường dẫn
  sheet.setColumnWidth(6, 150);  // Trạng thái

  // Freeze header row (row 6) để luôn hiển thị khi scroll
  sheet.setFrozenRows(headerRow);

  // Thêm conditional formatting
  addConditionalFormatting(sheet);

  Logger.log("✅ Đã thiết lập metadata (rows 1-5), headers (row 6), conditional formatting cho Google Sheets tracking");
}

/**
 * Thêm conditional formatting cho tracking sheet
 * @param {Sheet} sheet - Google Sheet object
 */
function addConditionalFormatting(sheet) {
  const config = getConfig();

  try {
    // Lấy range cho cột trạng thái (cột 6)
    const statusColumnRange = sheet.getRange("F:F");

    // Xóa conditional formatting cũ
    statusColumnRange.clearFormat();

    // Thêm conditional formatting cho từng trạng thái
    const rules = [];

    // Trạng thái "Chưa copy" - Đỏ
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(config.COPY_STATUS.PENDING.text)
      .setBackground(config.COPY_STATUS.PENDING.backgroundColor)
      .setFontColor(config.COPY_STATUS.PENDING.fontColor)
      .setRanges([statusColumnRange])
      .build());

    // Trạng thái "Đã copy" - Xanh lá
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(config.COPY_STATUS.COMPLETED.text)
      .setBackground(config.COPY_STATUS.COMPLETED.backgroundColor)
      .setFontColor(config.COPY_STATUS.COMPLETED.fontColor)
      .setRanges([statusColumnRange])
      .build());

    // Trạng thái "Lỗi copy" - Vàng
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(config.COPY_STATUS.ERROR.text)
      .setBackground(config.COPY_STATUS.ERROR.backgroundColor)
      .setFontColor(config.COPY_STATUS.ERROR.fontColor)
      .setRanges([statusColumnRange])
      .build());

    // Trạng thái "File không tồn tại" - Xám
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(config.COPY_STATUS.NOT_FOUND.text)
      .setBackground(config.COPY_STATUS.NOT_FOUND.backgroundColor)
      .setFontColor(config.COPY_STATUS.NOT_FOUND.fontColor)
      .setRanges([statusColumnRange])
      .build());

    // Áp dụng tất cả rules
    sheet.setConditionalFormatRules(rules);

    Logger.log("🎨 Đã thêm conditional formatting cho tracking sheet");

  } catch (error) {
    Logger.log("❌ Lỗi khi thêm conditional formatting: " + error.toString());
  }
}

/**
 * Thêm metadata và thông tin bổ sung vào Google Sheets (rows 1-5)
 * @param {Sheet} sheet - Google Sheet object
 */
function addMetadataToSheet(sheet) {
  try {
    const metadataStartRow = 1; // Metadata bắt đầu từ row 1

    Logger.log("📊 Thêm metadata tại rows 1-5");

    // Batch tất cả metadata values (5 rows) - Cột A:B cho thông tin cơ bản, Cột C:D cho counters
    const metadataValues = [
      ["Metadata:", "", "", ""],
      ["Tạo bởi:", "DriveCopyAppScript v1.0 ", "Tổng số file:", 0],
      ["Thời gian tạo:", new Date(), "Số lần chạy:", 0],
      ["Người tạo:", Session.getActiveUser().getEmail(), "File đã copy:", 0],
      ["Script version:", "v1.0", "", ""]
    ];

    // Batch insert metadata at rows 1-5 (4 columns: A, B, C, D)
    const metadataRange = sheet.getRange(metadataStartRow, 1, metadataValues.length, 4);
    metadataRange.setValues(metadataValues);

    // Format metadata header (row 1)
    const headerCell = sheet.getRange(metadataStartRow, 1);
    headerCell.setFontWeight("bold");
    headerCell.setBackground("#E3F2FD");

    // Format counter labels (C2:C4)
    const counterLabelsRange = sheet.getRange(2, 3, 3, 1);
    counterLabelsRange.setFontWeight("bold");
    counterLabelsRange.setBackground("#E8F5E8");

    // Format counter values (D2:D4)
    const counterValuesRange = sheet.getRange(2, 4, 3, 1);
    counterValuesRange.setNumberFormat("0");
    counterValuesRange.setBackground("#F0F8F0");

    // Format metadata section background
    const metadataSection = sheet.getRange(1, 1, 5, 6); // Cover all 6 columns for metadata
    metadataSection.setBackground("#F8F9FA");

    Logger.log("📊 Đã thêm metadata với counters vào rows 1-5");

  } catch (error) {
    Logger.log("❌ Lỗi khi thêm metadata: " + error.toString());
  }
}

/**
 * Speed optimized scan and update tracking sheet
 * @param {string} sourceFolderId - ID folder nguồn
 * @param {Sheet} sheet - Google Sheet object
 * @param {PerformanceEngine} performanceEngine - Performance engine instance
 * @return {number} Số item được thêm mới
 */
function speedOptimizedScanAndUpdate(sourceFolderId, sheet, performanceEngine) {
  const sourceFolder = DriveApp.getFolderById(sourceFolderId);

  Logger.log("🚀 Bắt đầu speed optimized scan folder: " + sourceFolder.getName());

  // Sử dụng speed optimized folder scan
  const sourceItems = performanceEngine.speedOptimizedFolderScan(sourceFolder, "", { recursive: true });
  Logger.log("📁 Tìm thấy " + sourceItems.length + " item trong folder nguồn (SPEED OPTIMIZED)");

  // Lấy dữ liệu hiện tại trong sheet (data bắt đầu từ row 7)
  const lastRow = sheet.getLastRow();
  const dataStartRow = 7; // Data bắt đầu từ row 7 (metadata: 1-5, header: 6, data: 7+)
  const existingData = lastRow >= dataStartRow ? sheet.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, 6).getValues() : [];

  Logger.log(`🔍 DEBUG: lastRow=${lastRow}, dataStartRow=${dataStartRow}, existingData.length=${existingData.length}`);

  // Tạo map của existing items để tìm kiếm nhanh
  const existingItemsMap = new Map();
  existingData.forEach((row, index) => {
    const itemPath = row[4]; // Cột đường dẫn
    existingItemsMap.set(itemPath, {
      rowIndex: index + dataStartRow, // Adjust for new layout
      data: row
    });
  });

  // Tìm item mới cần thêm
  const newItemsData = [];
  const newItemsFormatting = [];
  let newItemsCount = 0;
  let stt = lastRow >= dataStartRow ? lastRow - dataStartRow + 1 : 0; // Calculate STT based on existing data rows

  sourceItems.forEach(item => {
    if (!existingItemsMap.has(item.path)) {
      stt++;
      newItemsCount++;

      const itemData = [
        stt,
        item.name,
        item.type,
        item.type === 'File' ? formatFileSize(item.size) : '-',
        item.path,
        'Chưa copy'
      ];

      newItemsData.push(itemData);

      // Thêm formatting cho trạng thái (adjust for new layout)
      newItemsFormatting.push({
        row: dataStartRow + existingData.length + newItemsCount - 1, // Correct row calculation
        backgroundColor: "#FF0000",
        fontColor: "#FFFFFF"
      });
    }
  });

  // Batch insert tất cả item mới cùng lúc
  if (newItemsData.length > 0) {
    const startRow = lastRow >= dataStartRow ? lastRow + 1 : dataStartRow; // Start from row 7 or after existing data
    const endRow = startRow + newItemsData.length - 1;
    const range = `A${startRow}:F${endRow}`;

    Logger.log(`🔍 DEBUG: lastRow=${lastRow}, dataStartRow=${dataStartRow}, startRow=${startRow}, endRow=${endRow}, range=${range}, dataLength=${newItemsData.length}`);
    Logger.log(`🔍 DEBUG: First 3 items data:`, newItemsData.slice(0, 3));

    // Sử dụng performance engine để batch update
    performanceEngine.addSheetValueUpdate(
      sheet,
      range,
      newItemsData,
      true // High priority
    );

    // Batch format trạng thái với chunking để tránh timeout
    Logger.log(`🎨 Preparing ${newItemsFormatting.length} format operations...`);

    // Xử lý format theo chunks để tránh timeout
    const formatChunkSize = performanceEngine.BATCH_LIMITS.FORMAT_CHUNK_SIZE || 100;
    for (let i = 0; i < newItemsFormatting.length; i += formatChunkSize) {
      const chunk = newItemsFormatting.slice(i, i + formatChunkSize);

      Logger.log(`🔄 Đang xử lý chunk định dạng ${Math.floor(i / formatChunkSize) + 1}/${Math.ceil(newItemsFormatting.length / formatChunkSize)} (${chunk.length} thao tác)`);

      chunk.forEach(format => {
        performanceEngine.addSheetFormatUpdate(
          sheet,
          `F${format.row}`,
          {
            backgroundColor: format.backgroundColor,
            fontColor: format.fontColor
          }
        );
      });

      // Kiểm tra timeout risk sau mỗi chunk
      if (performanceEngine.checkTimeoutRisk()) {
        Logger.log(`⚠️ Phát hiện nguy cơ timeout, dừng xử lý định dạng tại chunk ${Math.floor(i / formatChunkSize) + 1}`);
        break;
      }
    }

    // Flush updates với timeout protection
    performanceEngine.flushAll();

    Logger.log("✅ Đã batch insert " + newItemsData.length + " item mới (SPEED OPTIMIZED)");
  }

  // Kiểm tra item đã bị xóa
  checkDeletedItems(sourceItems, existingData, sheet, performanceEngine);

  Logger.log("📊 Đã thêm " + newItemsCount + " item mới vào tracking sheet");

  // Cập nhật tổng số file sau khi scan lần đầu (chỉ khi có item mới)
  if (newItemsCount > 0) {
    updateTotalFileCount(sheet, performanceEngine);
  }

  return newItemsCount;
}

/**
 * Kiểm tra và đánh dấu item đã bị xóa
 * @param {Array} sourceItems - Danh sách item hiện tại trong source
 * @param {Array} existingData - Dữ liệu hiện tại trong sheet
 * @param {Sheet} sheet - Google Sheet object
 * @param {PerformanceEngine} performanceEngine - Performance engine instance
 */
function checkDeletedItems(sourceItems, existingData, sheet, performanceEngine) {
  const config = getConfig();

  // Tạo Set của item paths hiện tại để tìm kiếm nhanh
  const currentItemPaths = new Set(sourceItems.map(item => item.path));

  let deletedCount = 0;

  existingData.forEach((row, index) => {
    const itemPath = row[4]; // Cột đường dẫn
    const currentStatus = row[5]; // Cột trạng thái

    // Nếu item không còn tồn tại và chưa được đánh dấu là "File không tồn tại"
    if (!currentItemPaths.has(itemPath) && currentStatus !== config.COPY_STATUS.NOT_FOUND.text) {
      const dataStartRow = 7; // Data bắt đầu từ row 7
      const rowNumber = index + dataStartRow; // Adjust for new layout

      // Cập nhật trạng thái thành "File không tồn tại"
      performanceEngine.addSheetValueUpdate(
        sheet,
        `F${rowNumber}`,
        [[config.COPY_STATUS.NOT_FOUND.text]]
      );

      performanceEngine.addSheetFormatUpdate(
        sheet,
        `F${rowNumber}`,
        {
          backgroundColor: config.COPY_STATUS.NOT_FOUND.backgroundColor,
          fontColor: config.COPY_STATUS.NOT_FOUND.fontColor
        }
      );

      deletedCount++;
    }
  });

  if (deletedCount > 0) {
    performanceEngine.flushAll();
    Logger.log("🗑️ Đã đánh dấu " + deletedCount + " item không còn tồn tại");
  }
}

/**
 * Lấy danh sách item cần copy theo thứ tự tối ưu (folder trước, file sau)
 * @param {Sheet} sheet - Google Sheet object
 * @return {Array} Danh sách item cần copy
 */
function getPendingItemsOrdered(sheet) {
  const config = getConfig();
  const lastRow = sheet.getLastRow();
  const dataStartRow = 7; // Data bắt đầu từ row 7

  if (lastRow < dataStartRow) {
    return [];
  }

  const data = sheet.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, 6).getValues();
  const pendingItems = [];

  data.forEach((row, index) => {
    const status = row[5]; // Cột trạng thái

    if (status === config.COPY_STATUS.PENDING.text) {
      pendingItems.push({
        stt: row[0],
        itemName: row[1],
        itemType: row[2],
        itemSize: row[3],
        itemPath: row[4],
        rowNumber: index + dataStartRow, // Adjust for new layout
        parentPath: getParentPath(row[4])
      });
    }
  });

  // Sắp xếp: folder trước, file sau, theo depth (shallow trước)
  pendingItems.sort((a, b) => {
    // Folder có ưu tiên cao hơn file
    if (a.itemType.includes("Folder") && !b.itemType.includes("Folder")) {
      return -1;
    }
    if (!a.itemType.includes("Folder") && b.itemType.includes("Folder")) {
      return 1;
    }

    // Cùng loại thì sắp xếp theo depth (shallow trước)
    const depthA = (a.itemPath.match(/\//g) || []).length;
    const depthB = (b.itemPath.match(/\//g) || []).length;

    if (depthA !== depthB) {
      return depthA - depthB;
    }

    // Cùng depth thì sắp xếp theo tên
    return a.itemPath.localeCompare(b.itemPath);
  });

  // Giới hạn số item xử lý mỗi lần để tránh timeout
  const maxItemsPerRun = config.MAX_FILES_PER_RUN || 50;
  return pendingItems.slice(0, maxItemsPerRun);
}

/**
 * Lấy parent path từ full path
 * @param {string} fullPath - Đường dẫn đầy đủ
 * @return {string} Parent path
 */
function getParentPath(fullPath) {
  const lastSlashIndex = fullPath.lastIndexOf('/');
  return lastSlashIndex > 0 ? fullPath.substring(0, lastSlashIndex) : '';
}

/**
 * Thực hiện copy có cấu trúc với performance optimization
 * @param {Array} pendingItems - Danh sách item cần copy
 * @param {string} sourceFolderId - ID folder nguồn
 * @param {string} destFolderId - ID folder đích
 * @param {Sheet} sheet - Google Sheet object
 * @param {PerformanceEngine} performanceEngine - Performance engine instance
 * @return {Object} Kết quả copy
 */
function performStructuredCopy(pendingItems, sourceFolderId, destFolderId, sheet, performanceEngine) {
  const sourceFolder = DriveApp.getFolderById(sourceFolderId);
  const destFolder = DriveApp.getFolderById(destFolderId);

  let copiedItems = 0;
  let errorItems = 0;
  let skippedItems = 0;

  // Tạo cache cho folder mapping
  const folderCache = new Map();
  folderCache.set('', destFolder); // Root mapping

  // Lấy danh sách item đã có trong destination để kiểm tra duplicate
  const existingDestItems = getExistingItemsInDestination(destFolder);

  pendingItems.forEach(itemInfo => {
    try {
      Logger.log("🔄 Đang xử lý " + itemInfo.itemType + ": " + itemInfo.itemPath + " (STT: " + itemInfo.stt + ")");

      if (itemInfo.itemType.includes("Folder")) {
        // Xử lý folder
        const result = processFolderCopy(itemInfo, sourceFolder, folderCache, existingDestItems, sheet, performanceEngine);
        if (result.success) copiedItems++;
        else if (result.skipped) skippedItems++;
        else errorItems++;

      } else {
        // Xử lý file
        const result = processFileCopy(itemInfo, sourceFolder, folderCache, existingDestItems, sheet, performanceEngine);
        if (result.success) copiedItems++;
        else if (result.skipped) skippedItems++;
        else errorItems++;
      }

      // Update performance metrics
      performanceEngine.updateSpeedMetrics(1, 100); // Estimate 100ms per operation

    } catch (error) {
      Logger.log("❌ Lỗi khi xử lý item " + itemInfo.itemPath + ": " + error.toString());
      updateFileStatus(sheet, itemInfo.rowNumber, 'ERROR', { note: error.toString().substring(0, 50) }, performanceEngine);
      errorItems++;
    }
  });

  // Flush tất cả pending operations
  performanceEngine.flushAll();

  return {
    copiedItems: copiedItems,
    errorItems: errorItems,
    skippedItems: skippedItems
  };
}

/**
 * Lấy danh sách item đã có trong destination folder
 * @param {Folder} destFolder - Folder đích
 * @return {Map} Map của existing items
 */
function getExistingItemsInDestination(destFolder) {
  const existingItems = new Map();

  try {
    // Lấy tất cả files
    const fileIterator = destFolder.getFiles();
    while (fileIterator.hasNext()) {
      const file = fileIterator.next();
      const key = file.getName() + "_" + file.getSize();
      existingItems.set(key, {
        type: 'File',
        id: file.getId(),
        name: file.getName(),
        size: file.getSize()
      });
    }

    // Lấy tất cả folders
    const folderIterator = destFolder.getFolders();
    while (folderIterator.hasNext()) {
      const folder = folderIterator.next();
      const key = folder.getName() + "_0"; // Folder size = 0
      existingItems.set(key, {
        type: 'Folder',
        id: folder.getId(),
        name: folder.getName(),
        size: 0
      });
    }

  } catch (error) {
    Logger.log("❌ Lỗi khi lấy existing items: " + error.toString());
  }

  return existingItems;
}

/**
 * Xử lý copy folder với cache mapping
 * @param {Object} itemInfo - Thông tin item
 * @param {Folder} sourceFolder - Folder nguồn
 * @param {Map} folderCache - Cache mapping folder
 * @param {Map} existingDestItems - Map existing items trong destination
 * @param {Sheet} sheet - Google Sheet object
 * @param {PerformanceEngine} performanceEngine - Performance engine instance
 * @return {Object} Kết quả copy
 */
function processFolderCopy(itemInfo, sourceFolder, folderCache, existingDestItems, sheet, performanceEngine) {
  try {
    // Tìm source folder
    const sourceSubFolder = findItemByPath(sourceFolder, itemInfo.itemPath);
    if (!sourceSubFolder) {
      Logger.log("❌ Không tìm thấy folder: " + itemInfo.itemPath);
      updateFileStatus(sheet, itemInfo.rowNumber, 'ERROR', { note: 'Folder not found' }, performanceEngine);
      return { success: false, skipped: false };
    }

    // Kiểm tra duplicate
    const duplicateKey = itemInfo.itemName + "_0";
    if (existingDestItems.has(duplicateKey)) {
      Logger.log("⏭️ Folder đã tồn tại, bỏ qua: " + itemInfo.itemPath);
      updateFileStatus(sheet, itemInfo.rowNumber, 'COMPLETED', { note: 'Already exists' }, performanceEngine);
      return { success: false, skipped: true };
    }

    // Tạo hoặc lấy parent folder
    const destParentFolder = getOrCreateParentFolder(itemInfo.parentPath, folderCache, sourceFolder);

    // Tạo folder mới
    const newFolder = performanceEngine.executeWithBackoff(
      () => destParentFolder.createFolder(itemInfo.itemName),
      [],
      'driveWrite',
      2
    );

    // Cập nhật cache
    folderCache.set(itemInfo.itemPath, newFolder);

    Logger.log("📁 Đã tạo folder: " + itemInfo.itemPath);
    updateFileStatus(sheet, itemInfo.rowNumber, 'COMPLETED', {}, performanceEngine);

    return { success: true, skipped: false };

  } catch (error) {
    Logger.log("❌ Lỗi khi copy folder " + itemInfo.itemPath + ": " + error.toString());
    updateFileStatus(sheet, itemInfo.rowNumber, 'ERROR', { note: error.toString().substring(0, 50) }, performanceEngine);
    return { success: false, skipped: false };
  }
}

/**
 * Xử lý copy file trong cấu trúc folder
 * @param {Object} itemInfo - Thông tin item
 * @param {Folder} sourceFolder - Folder nguồn
 * @param {Map} folderCache - Cache mapping folder
 * @param {Map} existingDestItems - Map existing items trong destination
 * @param {Sheet} sheet - Google Sheet object
 * @param {PerformanceEngine} performanceEngine - Performance engine instance
 * @return {Object} Kết quả copy
 */
function processFileCopy(itemInfo, sourceFolder, folderCache, existingDestItems, sheet, performanceEngine) {
  try {
    // Tìm source file
    const sourceFile = findItemByPath(sourceFolder, itemInfo.itemPath);
    if (!sourceFile) {
      Logger.log("❌ Không tìm thấy file: " + itemInfo.itemPath);
      updateFileStatus(sheet, itemInfo.rowNumber, 'ERROR', { note: 'File not found' }, performanceEngine);
      return { success: false, skipped: false };
    }

    // Kiểm tra duplicate (tên + size)
    const fileSize = sourceFile.getSize();
    const duplicateKey = itemInfo.itemName + "_" + fileSize;

    if (existingDestItems.has(duplicateKey)) {
      Logger.log("⏭️ File đã tồn tại, bỏ qua: " + itemInfo.itemPath);
      updateFileStatus(sheet, itemInfo.rowNumber, 'COMPLETED', { note: 'Already exists' }, performanceEngine);
      return { success: false, skipped: true };
    }

    // Tạo hoặc lấy parent folder
    const destParentFolder = getOrCreateParentFolder(itemInfo.parentPath, folderCache, sourceFolder);

    // Copy file với performance optimization
    performanceEngine.executeWithBackoff(
      () => sourceFile.makeCopy(itemInfo.itemName, destParentFolder),
      [],
      'driveWrite',
      2
    );

    Logger.log("📄 Đã copy file: " + itemInfo.itemPath);
    updateFileStatus(sheet, itemInfo.rowNumber, 'COMPLETED', {}, performanceEngine);

    return { success: true, skipped: false };

  } catch (error) {
    Logger.log("❌ Lỗi khi copy file " + itemInfo.itemPath + ": " + error.toString());
    updateFileStatus(sheet, itemInfo.rowNumber, 'ERROR', { note: error.toString().substring(0, 50) }, performanceEngine);
    return { success: false, skipped: false };
  }
}

/**
 * Tìm item theo đường dẫn trong folder tree
 * @param {Folder} rootFolder - Folder gốc
 * @param {string} itemPath - Đường dẫn item
 * @return {File|Folder|null} Item tìm được hoặc null
 */
function findItemByPath(rootFolder, itemPath) {
  try {
    if (!itemPath || itemPath === '') {
      return rootFolder;
    }

    const pathParts = itemPath.split('/');
    let currentFolder = rootFolder;

    // Duyệt qua từng phần của path
    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderName = pathParts[i];
      const subFolders = currentFolder.getFoldersByName(folderName);

      if (!subFolders.hasNext()) {
        Logger.log("❌ Không tìm thấy folder: " + folderName + " trong path: " + itemPath);
        return null;
      }

      currentFolder = subFolders.next();
    }

    // Tìm item cuối cùng (có thể là file hoặc folder)
    const itemName = pathParts[pathParts.length - 1];

    // Thử tìm file trước
    const files = currentFolder.getFilesByName(itemName);
    if (files.hasNext()) {
      return files.next();
    }

    // Nếu không phải file thì tìm folder
    const folders = currentFolder.getFoldersByName(itemName);
    if (folders.hasNext()) {
      return folders.next();
    }

    Logger.log("❌ Không tìm thấy item: " + itemName + " trong path: " + itemPath);
    return null;

  } catch (error) {
    Logger.log("❌ Lỗi khi tìm item theo path " + itemPath + ": " + error.toString());
    return null;
  }
}

/**
 * Tạo hoặc lấy parent folder với cache
 * @param {string} parentPath - Đường dẫn parent
 * @param {Map} folderCache - Cache mapping folder
 * @param {Folder} sourceFolder - Folder nguồn để reference
 * @return {Folder} Parent folder
 */
function getOrCreateParentFolder(parentPath, folderCache, sourceFolder) {
  // Nếu là root level
  if (!parentPath || parentPath === '') {
    return folderCache.get('');
  }

  // Kiểm tra cache trước
  if (folderCache.has(parentPath)) {
    return folderCache.get(parentPath);
  }

  // Tạo parent folder hierarchy
  const pathParts = parentPath.split('/');
  let currentPath = '';
  let currentFolder = folderCache.get(''); // Root folder

  for (const folderName of pathParts) {
    currentPath = currentPath ? currentPath + '/' + folderName : folderName;

    if (folderCache.has(currentPath)) {
      currentFolder = folderCache.get(currentPath);
    } else {
      // Tạo folder mới
      const newFolder = getOrCreateFolder(folderName, currentFolder);
      folderCache.set(currentPath, newFolder);
      currentFolder = newFolder;

      Logger.log("📁 Đã tạo parent folder: " + currentPath);
    }
  }

  return currentFolder;
}

/**
 * Cập nhật trạng thái file trong tracking sheet
 * @param {Sheet} sheet - Google Sheet object
 * @param {number} rowNumber - Số dòng cần cập nhật
 * @param {string} status - Trạng thái mới
 * @param {Object} options - Tùy chọn bổ sung
 * @param {PerformanceEngine} performanceEngine - Performance engine instance
 */
function updateFileStatus(sheet, rowNumber, status, options = {}, performanceEngine) {
  const config = getConfig();
  let statusText, backgroundColor, fontColor;

  // Defensive programming: Đảm bảo options không null/undefined
  if (!options || typeof options !== 'object') {
    options = {};
  }

  // Xác định format dựa trên status
  switch (status) {
    case 'COMPLETED':
      statusText = config.COPY_STATUS.COMPLETED.text;
      backgroundColor = config.COPY_STATUS.COMPLETED.backgroundColor;
      fontColor = config.COPY_STATUS.COMPLETED.fontColor;
      break;
    case 'ERROR':
      statusText = config.COPY_STATUS.ERROR.text;
      backgroundColor = config.COPY_STATUS.ERROR.backgroundColor;
      fontColor = config.COPY_STATUS.ERROR.fontColor;
      if (options && options.note) {
        statusText += " (" + options.note + ")";
      }
      break;
    case 'NOT_FOUND':
      statusText = config.COPY_STATUS.NOT_FOUND.text;
      backgroundColor = config.COPY_STATUS.NOT_FOUND.backgroundColor;
      fontColor = config.COPY_STATUS.NOT_FOUND.fontColor;
      break;
    default:
      statusText = config.COPY_STATUS.PENDING.text;
      backgroundColor = config.COPY_STATUS.PENDING.backgroundColor;
      fontColor = config.COPY_STATUS.PENDING.fontColor;
  }

  // Thêm note nếu có (với null check an toàn)
  if (options && options.note && status === 'COMPLETED') {
    statusText += " (" + options.note + ")";
  }

  // Batch update status
  performanceEngine.addSheetValueUpdate(
    sheet,
    `F${rowNumber}`,
    [[statusText]]
  );

  performanceEngine.addSheetFormatUpdate(
    sheet,
    `F${rowNumber}`,
    {
      backgroundColor: backgroundColor,
      fontColor: fontColor
    }
  );
}

/**
 * Lấy tổng số items trong tracking sheet
 * @param {Sheet} sheet - Google Sheet object
 * @return {number} Tổng số items
 */
function getTotalItemsCount(sheet) {
  const lastRow = sheet.getLastRow();
  const dataStartRow = 7; // Data bắt đầu từ row 7
  return lastRow >= dataStartRow ? lastRow - dataStartRow + 1 : 0;
}

/**
 * Lấy số items đã hoàn thành
 * @param {Sheet} sheet - Google Sheet object
 * @return {number} Số items đã hoàn thành
 */
function getCompletedItemsCount(sheet) {
  const config = getConfig();
  const lastRow = sheet.getLastRow();
  const dataStartRow = 7; // Data bắt đầu từ row 7

  if (lastRow < dataStartRow) {
    return 0;
  }

  const statusData = sheet.getRange(dataStartRow, 6, lastRow - dataStartRow + 1, 1).getValues();
  let completedCount = 0;

  statusData.forEach(row => {
    const status = row[0];
    if (status && status.toString().includes(config.COPY_STATUS.COMPLETED.text)) {
      completedCount++;
    }
  });

  return completedCount;
}

/**
 * Lấy số items có lỗi
 * @param {Sheet} sheet - Google Sheet object
 * @return {number} Số items có lỗi
 */
function getErrorItemsCount(sheet) {
  const config = getConfig();
  const lastRow = sheet.getLastRow();
  const dataStartRow = 7; // Data bắt đầu từ row 7

  if (lastRow < dataStartRow) {
    return 0;
  }

  const statusData = sheet.getRange(dataStartRow, 6, lastRow - dataStartRow + 1, 1).getValues();
  let errorCount = 0;

  statusData.forEach(row => {
    const status = row[0];
    if (status && status.toString().includes(config.COPY_STATUS.ERROR.text)) {
      errorCount++;
    }
  });

  return errorCount;
}

/**
 * Tạo báo cáo chi tiết về quá trình copy với metadata tracking
 * @param {Object} copyResult - Kết quả copy
 * @param {string} sourceFolderId - ID folder nguồn
 * @param {string} destFolderId - ID folder đích
 * @return {string} Báo cáo chi tiết
 */
function generateCopyReport(copyResult, sourceFolderId, destFolderId) {
  try {
    let report = "📊 BÁO CÁO COPY CHI TIẾT v1.0\n";
    report += "=" * 50 + "\n\n";

    // Thông tin folder
    const sourceFolder = DriveApp.getFolderById(sourceFolderId);
    const destFolder = DriveApp.getFolderById(destFolderId);

    report += "📁 THÔNG TIN FOLDER:\n";
    report += "- Nguồn: " + sourceFolder.getName() + "\n";
    report += "- Đích: " + destFolder.getName() + "\n";
    report += "- URL đích: " + destFolder.getUrl() + "\n\n";

    // Đọc metadata từ tracking sheet
    const metadataInfo = getMetadataFromTrackingSheet(sourceFolderId, destFolderId);

    // Metadata tracking section
    if (metadataInfo.hasMetadata) {
      report += "📊 METADATA TRACKING:\n";
      report += "- Tổng số file đã scan: " + metadataInfo.totalFiles + "\n";
      report += "- Số lần script đã chạy: " + metadataInfo.runCount + "\n";
      report += "- Số file đã copy thành công: " + metadataInfo.copiedFiles + "\n";

      // Tính tỷ lệ hoàn thành dựa trên metadata
      const metadataCompletionRate = metadataInfo.totalFiles > 0 ?
        ((metadataInfo.copiedFiles / metadataInfo.totalFiles) * 100).toFixed(2) : 0;

      report += "- Tỷ lệ hoàn thành (metadata): " + metadataCompletionRate + "%\n";
      report += generateProgressBar(metadataCompletionRate) + "\n\n";
    }
    if (metadataInfo.trackingSheetUrl) {
      report += "- 📋 Tracking Sheet: " + metadataInfo.trackingSheetUrl + "\n";
    }
    report += "\n";

    return report;

  } catch (error) {
    return "❌ Lỗi khi tạo báo cáo: " + error.toString();
  }
}

/**
 * Cập nhật tổng số file trong metadata (C2:D2) - chỉ ghi 1 lần sau scan đầu tiên
 * @param {Sheet} sheet - Google Sheet object
 * @param {PerformanceEngine} performanceEngine - Performance engine instance
 */
function updateTotalFileCount(sheet, performanceEngine) {
  try {
    // Đếm tổng số rows có dữ liệu file (từ row 7 trở đi)
    const lastRow = sheet.getLastRow();
    const dataStartRow = 7;

    if (lastRow < dataStartRow) {
      Logger.log("📊 Không có dữ liệu để đếm tổng số file");
      return;
    }

    const totalFiles = lastRow - dataStartRow + 1;

    // Cập nhật giá trị tổng số file tại D2
    performanceEngine.addSheetValueUpdate(
      sheet,
      "D2",
      [[totalFiles]],
      true // High priority
    );

    performanceEngine.flushAll();
    Logger.log(`📊 Đã cập nhật tổng số file: ${totalFiles}`);

  } catch (error) {
    Logger.log("❌ Lỗi khi cập nhật tổng số file: " + error.toString());
  }
}

/**
 * Tăng số lần chạy script trong metadata (C3:D3)
 * @param {Sheet} sheet - Google Sheet object
 * @param {PerformanceEngine} performanceEngine - Performance engine instance
 */
function incrementRunCount(sheet, performanceEngine) {
  try {
    // Đọc giá trị hiện tại trong D3
    const currentValue = sheet.getRange("D3").getValue();
    const newValue = (typeof currentValue === 'number' ? currentValue : 0) + 1;

    // Cập nhật giá trị mới
    performanceEngine.addSheetValueUpdate(
      sheet,
      "D3",
      [[newValue]],
      true // High priority
    );

    performanceEngine.flushAll();
    Logger.log(`📊 Đã tăng số lần chạy: ${newValue}`);

  } catch (error) {
    Logger.log("❌ Lỗi khi tăng số lần chạy: " + error.toString());
  }
}

/**
 * Cập nhật số file đã copy thành công trong metadata (C4:D4)
 * @param {Sheet} sheet - Google Sheet object
 * @param {PerformanceEngine} performanceEngine - Performance engine instance
 */
function updateCopiedFileCount(sheet, performanceEngine) {
  try {
    const config = getConfig();
    const lastRow = sheet.getLastRow();
    const dataStartRow = 7;

    if (lastRow < dataStartRow) {
      Logger.log("📊 Không có dữ liệu để đếm file đã copy");
      return;
    }

    // Đọc tất cả dữ liệu trạng thái
    const statusData = sheet.getRange(dataStartRow, 6, lastRow - dataStartRow + 1, 1).getValues();

    // Đếm số file có trạng thái "Đã copy"
    let copiedCount = 0;
    statusData.forEach(row => {
      const status = row[0];
      if (status === config.COPY_STATUS.COMPLETED.text ||
        (typeof status === 'string' && status.includes(config.COPY_STATUS.COMPLETED.text))) {
        copiedCount++;
      }
    });

    // Cập nhật giá trị tại D4
    performanceEngine.addSheetValueUpdate(
      sheet,
      "D4",
      [[copiedCount]],
      true // High priority
    );

    performanceEngine.flushAll();
    Logger.log(`📊 Đã cập nhật số file đã copy: ${copiedCount}`);

  } catch (error) {
    Logger.log("❌ Lỗi khi cập nhật số file đã copy: " + error.toString());
  }
}

/**
 * Kiểm tra và khởi tạo metadata cho sheet cũ (backward compatibility)
 * @param {Sheet} sheet - Google Sheet object
 * @param {PerformanceEngine} performanceEngine - Performance engine instance
 */
function ensureMetadataExists(sheet, performanceEngine) {
  try {
    // Kiểm tra xem metadata đã tồn tại chưa bằng cách check cell C2
    const metadataCheck = sheet.getRange("C2").getValue();

    if (!metadataCheck || metadataCheck !== "Tổng số file:") {
      Logger.log("📊 Sheet cũ phát hiện - khởi tạo metadata counters");

      // Thêm metadata counters cho sheet cũ
      const metadataCounters = [
        ["Tổng số file:", 0],
        ["Số lần chạy:", 1], // Bắt đầu từ 1 cho sheet cũ
        ["File đã copy:", 0]
      ];

      // Batch update metadata counters tại C2:D4
      performanceEngine.addSheetValueUpdate(
        sheet,
        "C2:D4",
        metadataCounters,
        true // High priority
      );

      // Format counter labels (C2:C4)
      performanceEngine.addSheetFormatUpdate(
        sheet,
        "C2:C4",
        {
          fontWeight: "bold",
          backgroundColor: "#E8F5E8"
        }
      );

      // Format counter values (D2:D4)
      performanceEngine.addSheetFormatUpdate(
        sheet,
        "D2:D4",
        {
          numberFormat: "0",
          backgroundColor: "#F0F8F0"
        }
      );

      performanceEngine.flushAll();
      Logger.log("✅ Đã khởi tạo metadata cho sheet cũ");

      // Cập nhật tổng số file và file đã copy cho sheet cũ
      updateTotalFileCount(sheet, performanceEngine);
      updateCopiedFileCount(sheet, performanceEngine);
    }

  } catch (error) {
    Logger.log("❌ Lỗi khi kiểm tra metadata: " + error.toString());
  }
}

/**
 * Đọc metadata từ tracking sheet với batch operations
 * @param {string} sourceFolderId - ID folder nguồn
 * @param {string} destFolderId - ID folder đích
 * @return {Object} Metadata info {hasMetadata, totalFiles, runCount, copiedFiles, trackingSheetUrl}
 */
function getMetadataFromTrackingSheet(sourceFolderId, destFolderId) {
  try {
    const config = getConfig();
    const destFolder = DriveApp.getFolderById(destFolderId);

    // Tạo tên file tracking sheet
    const fileName = config.TRACKING_SHEET_NAME_PATTERN
      .replace("{SOURCE_ID}", sourceFolderId)
      .replace("{DEST_ID}", destFolderId) + config.TRACKING_SHEET_EXTENSION;

    // Tìm tracking sheet
    const existingFiles = destFolder.getFilesByName(fileName);

    if (!existingFiles.hasNext()) {
      Logger.log("📊 Không tìm thấy tracking sheet cho metadata");
      return {
        hasMetadata: false,
        totalFiles: 0,
        runCount: 0,
        copiedFiles: 0,
        trackingSheetUrl: null
      };
    }

    const file = existingFiles.next();
    const spreadsheet = SpreadsheetApp.openById(file.getId());
    const sheet = spreadsheet.getActiveSheet();
    const trackingSheetUrl = spreadsheet.getUrl();

    // Batch đọc metadata từ D2:D4 (tối ưu performance)
    const metadataRange = sheet.getRange("D2:D4");
    const metadataValues = metadataRange.getValues();

    // Kiểm tra xem có metadata không bằng cách check cell C2
    const labelCheck = sheet.getRange("C2").getValue();
    const hasMetadata = labelCheck && labelCheck.toString().includes("Tổng số file");

    if (!hasMetadata) {
      Logger.log("📊 Sheet cũ không có metadata counters");
      return {
        hasMetadata: false,
        totalFiles: 0,
        runCount: 0,
        copiedFiles: 0,
        trackingSheetUrl: trackingSheetUrl
      };
    }

    // Parse metadata values
    const totalFiles = typeof metadataValues[0][0] === 'number' ? metadataValues[0][0] : 0;
    const runCount = typeof metadataValues[1][0] === 'number' ? metadataValues[1][0] : 0;
    const copiedFiles = typeof metadataValues[2][0] === 'number' ? metadataValues[2][0] : 0;

    Logger.log(`📊 Đã đọc metadata: totalFiles=${totalFiles}, runCount=${runCount}, copiedFiles=${copiedFiles}`);

    return {
      hasMetadata: true,
      totalFiles: totalFiles,
      runCount: runCount,
      copiedFiles: copiedFiles,
      trackingSheetUrl: trackingSheetUrl
    };

  } catch (error) {
    Logger.log("❌ Lỗi khi đọc metadata từ tracking sheet: " + error.toString());
    return {
      hasMetadata: false,
      totalFiles: 0,
      runCount: 0,
      copiedFiles: 0,
      trackingSheetUrl: null
    };
  }
}
