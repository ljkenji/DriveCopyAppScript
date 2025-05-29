/*
 * Performance Engine - Tích hợp tối ưu hóa hiệu suất cho DriveCopyAppScript v1.0
 * Author: Lj Kenji - https://fb.com/lj.kenji
 */

/**
 * Unified Performance Engine Class - Tích hợp tất cả performance features
 */
class PerformanceEngine {
  constructor() {
    this.config = getConfig();
    this.startTime = new Date();

    // API Management
    this.apiCallCount = 0;
    this.lastApiCall = 0;
    this.apiCounters = {
      driveRead: 0,
      driveWrite: 0,
      sheetsRead: 0,
      sheetsWrite: 0
    };

    // Optimized API limits for speed
    this.API_LIMITS = {
      DRIVE_READ_PER_MINUTE: this.config.DRIVE_READ_LIMIT || 1500,
      DRIVE_WRITE_PER_MINUTE: this.config.DRIVE_WRITE_LIMIT || 500,
      SHEETS_READ_PER_MINUTE: this.config.SHEETS_READ_LIMIT || 200,
      SHEETS_WRITE_PER_MINUTE: this.config.SHEETS_WRITE_LIMIT || 150,
      MIN_DELAY_MS: this.config.API_DELAY_MIN_MS || 50,
      MAX_DELAY_MS: this.config.API_DELAY_MAX_MS || 3000,
      ADAPTIVE_DELAY: this.config.ENABLE_ADAPTIVE_DELAY !== false
    };

    // Batch Operations - Tối ưu hóa để tránh timeout
    this.BATCH_LIMITS = {
      SHEETS_VALUES: this.config.BATCH_SIZE_SHEETS || 300,
      SHEETS_FORMATS: this.config.BATCH_SIZE_FORMATS || 200,
      DRIVE_OPERATIONS: this.config.BATCH_SIZE_DRIVE || 100,
      MEMORY_THRESHOLD: this.config.MEMORY_CLEANUP_THRESHOLD || 5000,
      PARALLEL_CHUNKS: this.config.PARALLEL_CHUNKS || 4,
      SCAN_CHUNK_SIZE: this.config.SCAN_CHUNK_SIZE || 500,
      FORMAT_CHUNK_SIZE: this.config.FORMAT_CHUNK_SIZE || 100,
      PROGRESSIVE_FLUSH_THRESHOLD: this.config.PROGRESSIVE_FLUSH_THRESHOLD || 150
    };

    // Batch queues
    this.sheetsValueQueue = [];
    this.sheetsFormatQueue = [];
    this.driveOperationQueue = [];
    this.priorityQueue = [];

    // Execution tracking để tránh timeout
    this.executionStartTime = new Date();
    this.operationCount = 0;
    this.lastProgressSave = new Date();

    // Speed Optimization
    this.SPEED_SETTINGS = {
      ENABLE_TURBO_MODE: this.config.PERFORMANCE_MODE === "SPEED",
      PARALLEL_PROCESSING: this.config.ENABLE_PARALLEL_PROCESSING !== false,
      SMART_CACHING: this.config.ENABLE_SMART_CACHING !== false,
      AGGRESSIVE_BATCHING: this.config.ENABLE_AGGRESSIVE_BATCHING !== false,
      FAST_SCAN_MODE: this.config.ENABLE_FAST_SCAN_MODE !== false
    };

    // Caching system
    this.cache = {
      folderStructure: new Map(),
      fileMetadata: new Map(),
      duplicateChecks: new Map(),
      lastCacheUpdate: new Date()
    };

    // Performance metrics
    this.speedMetrics = {
      startTime: new Date(),
      totalOperations: 0,
      operationsPerSecond: 0,
      cacheHitRate: 0,
      lastMeasurement: new Date()
    };

    this.operationStats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageProcessingTime: 0,
      lastFlushTime: new Date()
    };

    Logger.log("🚀 PerformanceEngine v1.0 đã khởi tạo - Hệ thống hiệu suất thống nhất đã được kích hoạt");
  }

  /**
   * Execute API call with exponential backoff and rate limiting
   */
  executeWithBackoff(apiFunction, args = [], apiType = 'driveRead', maxRetries = 3) {
    this.checkRateLimit(apiType);

    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.apiCallCount++;
        this.apiCounters[apiType]++;
        this.lastApiCall = Date.now();

        const result = apiFunction.apply(null, args);
        this.operationStats.successfulOperations++;
        return result;

      } catch (error) {
        lastError = error;
        this.operationStats.failedOperations++;

        if (attempt < maxRetries - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          Logger.log(`⚠️ API retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${error.toString().substring(0, 100)}`);
          Utilities.sleep(delay);
        }
      }
    }

    throw new Error(`Lời gọi API thất bại sau ${maxRetries} lần thử: ${lastError.toString()}`);
  }

  /**
   * Check and enforce rate limits
   */
  checkRateLimit(apiType) {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;

    // Adaptive delay based on API type and current load
    let requiredDelay = this.API_LIMITS.MIN_DELAY_MS;

    if (this.API_LIMITS.ADAPTIVE_DELAY) {
      const loadFactor = this.apiCallCount / 100; // Increase delay with load
      requiredDelay = Math.min(
        this.API_LIMITS.MIN_DELAY_MS * (1 + loadFactor * 0.1),
        this.API_LIMITS.MAX_DELAY_MS
      );
    }

    if (timeSinceLastCall < requiredDelay) {
      const sleepTime = requiredDelay - timeSinceLastCall;
      Utilities.sleep(sleepTime);
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateBackoffDelay(attempt) {
    const baseDelay = this.API_LIMITS.MIN_DELAY_MS;
    const maxDelay = this.API_LIMITS.MAX_DELAY_MS;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Add sheet value update to batch queue
   */
  addSheetValueUpdate(sheet, range, values, priority = false) {
    const operation = {
      sheet: sheet,
      range: range,
      values: values,
      timestamp: new Date(),
      type: 'values'
    };

    if (priority) {
      this.priorityQueue.push(operation);
      Logger.log(`🔍 DEBUG: Đã thêm vào hàng đợi ƯU TIÊN - phạm vi: ${range}, số lượng giá trị: ${values.length}, tổng số trong hàng đợi ưu tiên: ${this.priorityQueue.length}`);
    } else {
      this.sheetsValueQueue.push(operation);
      Logger.log(`🔍 DEBUG: Đã thêm vào hàng đợi THÔNG THƯỜNG - phạm vi: ${range}, số lượng giá trị: ${values.length}, tổng số trong hàng đợi thông thường: ${this.sheetsValueQueue.length}`);
    }

    // Auto-flush if queue is full
    if (this.sheetsValueQueue.length >= this.BATCH_LIMITS.SHEETS_VALUES) {
      this.flushSheetValueUpdates();
    }
  }

  /**
   * Add sheet format update to batch queue với progressive flushing
   */
  addSheetFormatUpdate(sheet, range, format, priority = false) {
    const operation = {
      sheet: sheet,
      range: range,
      format: format,
      timestamp: new Date(),
      type: 'format'
    };

    if (priority) {
      this.priorityQueue.push(operation);
    } else {
      this.sheetsFormatQueue.push(operation);
    }

    this.operationCount++;

    // Progressive flushing để tránh timeout
    if (this.sheetsFormatQueue.length >= this.BATCH_LIMITS.PROGRESSIVE_FLUSH_THRESHOLD) {
      Logger.log(`🔄 Progressive flush: ${this.sheetsFormatQueue.length} format operations`);
      this.flushSheetFormatUpdates();
    }

    // Auto-flush if queue is full
    if (this.sheetsFormatQueue.length >= this.BATCH_LIMITS.SHEETS_FORMATS) {
      this.flushSheetFormatUpdates();
    }

    // Kiểm tra timeout risk
    this.checkTimeoutRisk();
  }

  /**
   * Flush sheet value updates
   */
  flushSheetValueUpdates() {
    // Combine both regular queue and priority queue
    const allOperations = [...this.priorityQueue.filter(op => op.type === 'values'), ...this.sheetsValueQueue];

    if (allOperations.length === 0) return;

    Logger.log(`🚀 Đang xử lý ${allOperations.length} cập nhật giá trị sheet (${this.priorityQueue.filter(op => op.type === 'values').length} ưu tiên + ${this.sheetsValueQueue.length} thông thường)...`);

    // Group by sheet for batch processing
    const sheetGroups = new Map();

    allOperations.forEach(operation => {
      const sheetId = operation.sheet.getSheetId();
      if (!sheetGroups.has(sheetId)) {
        sheetGroups.set(sheetId, []);
      }
      sheetGroups.get(sheetId).push(operation);
    });

    // Process each sheet group
    sheetGroups.forEach((operations, sheetId) => {
      try {
        operations.forEach(op => {
          this.executeWithBackoff(
            () => op.sheet.getRange(op.range).setValues(op.values),
            [],
            'sheetsWrite',
            2
          );
        });

        this.operationStats.successfulOperations += operations.length;
      } catch (error) {
        Logger.log(`❌ Lỗi khi xử lý giá trị sheet: ${error.toString()}`);
        this.operationStats.failedOperations += operations.length;
      }
    });

    // Clear both queues
    this.sheetsValueQueue = [];
    this.priorityQueue = this.priorityQueue.filter(op => op.type !== 'values'); // Keep non-value operations
    this.operationStats.lastFlushTime = new Date();
  }

  /**
   * Flush sheet format updates với chunking để tránh timeout
   */
  flushSheetFormatUpdates() {
    // Combine both regular queue and priority queue
    const allFormatOperations = [...this.priorityQueue.filter(op => op.type === 'format'), ...this.sheetsFormatQueue];

    if (allFormatOperations.length === 0) return;

    Logger.log(`🎨 Đang xử lý ${allFormatOperations.length} cập nhật định dạng sheet (${this.priorityQueue.filter(op => op.type === 'format').length} ưu tiên + ${this.sheetsFormatQueue.length} thông thường)...`);

    // Xử lý theo chunks để tránh timeout
    const chunkSize = this.BATCH_LIMITS.FORMAT_CHUNK_SIZE;
    for (let i = 0; i < allFormatOperations.length; i += chunkSize) {
      const chunk = allFormatOperations.slice(i, i + chunkSize);

      Logger.log(`🔄 Đang xử lý chunk định dạng ${Math.floor(i / chunkSize) + 1}/${Math.ceil(allFormatOperations.length / chunkSize)} (${chunk.length} thao tác)`);

      chunk.forEach(operation => {
        try {
          const range = operation.sheet.getRange(operation.range);
          const format = operation.format;

          this.executeWithBackoff(() => {
            if (format.backgroundColor) range.setBackground(format.backgroundColor);
            if (format.fontColor) range.setFontColor(format.fontColor);
            if (format.fontWeight) range.setFontWeight(format.fontWeight);
            if (format.fontSize) range.setFontSize(format.fontSize);
          }, [], 'sheetsWrite', 2);

          this.operationStats.successfulOperations++;
        } catch (error) {
          Logger.log(`❌ Lỗi khi xử lý định dạng sheet: ${error.toString()}`);
          this.operationStats.failedOperations++;
        }
      });

      // Kiểm tra timeout risk sau mỗi chunk
      if (this.checkTimeoutRisk()) {
        Logger.log(`⚠️ Phát hiện nguy cơ timeout, dừng xử lý định dạng tại chunk ${Math.floor(i / chunkSize) + 1}`);
        break;
      }

      // Thêm delay nhỏ giữa các chunks
      if (i + chunkSize < allFormatOperations.length) {
        Utilities.sleep(50); // 50ms delay
      }
    }

    // Clear both queues
    this.sheetsFormatQueue = [];
    this.priorityQueue = this.priorityQueue.filter(op => op.type !== 'format'); // Keep non-format operations
    this.operationStats.lastFlushTime = new Date();
  }

  /**
   * Speed optimized folder scan
   */
  speedOptimizedFolderScan(folder, currentPath = "", options = {}) {
    const startTime = new Date();
    const results = [];

    try {
      // Check cache first
      const cacheKey = folder.getId() + "_" + currentPath;
      if (this.SPEED_SETTINGS.SMART_CACHING && this.cache.folderStructure.has(cacheKey)) {
        const cached = this.cache.folderStructure.get(cacheKey);
        if (this.isCacheValid(cached.timestamp)) {
          Logger.log(`⚡ Tìm thấy cache cho scan folder: ${currentPath || 'gốc'}`);
          this.speedMetrics.cacheHitRate++;
          return cached.data;
        }
      }

      // Perform optimized scan with pagination
      const fileIterator = folder.getFiles();
      let fileCount = 0;
      while (fileIterator.hasNext() && fileCount < this.config.FOLDER_SCAN_PAGE_SIZE) {
        const file = fileIterator.next();
        results.push({
          id: file.getId(),
          name: file.getName(),
          type: 'File',
          path: currentPath ? `${currentPath}/${file.getName()}` : file.getName(),
          size: file.getSize()
        });
        fileCount++;
      }

      // Cache results
      if (this.SPEED_SETTINGS.SMART_CACHING) {
        this.cache.folderStructure.set(cacheKey, {
          data: results,
          timestamp: new Date()
        });
      }

      // Update metrics
      const processingTime = new Date() - startTime;
      this.updateSpeedMetrics(results.length, processingTime);

      return results;

    } catch (error) {
      Logger.log(`❌ Lỗi trong quá trình scan tối ưu tốc độ: ${error.toString()}`);
      throw error;
    }
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid(timestamp) {
    const cacheAge = new Date() - timestamp;
    const maxAge = this.config.CACHE_MAX_AGE_MS || 300000; // 5 minutes default
    return cacheAge < maxAge;
  }

  /**
   * Standard folder scan
   */
  standardFolderScan(folder, currentPath, options) {
    const items = [];

    // Scan folders first
    const folderIterator = folder.getFolders();
    while (folderIterator.hasNext()) {
      const subFolder = this.executeWithBackoff(
        () => folderIterator.next(),
        [],
        'driveRead',
        1
      );

      const folderPath = currentPath ? `${currentPath}/${subFolder.getName()}` : subFolder.getName();
      items.push({
        id: subFolder.getId(),
        name: subFolder.getName(),
        type: 'Folder',
        path: folderPath,
        size: 0,
        parentPath: currentPath
      });

      // Recursive scan if enabled
      if (options.recursive !== false) {
        const subItems = this.standardFolderScan(subFolder, folderPath, options);
        items.push(...subItems);
      }
    }

    // Scan files
    const fileIterator = folder.getFiles();
    while (fileIterator.hasNext()) {
      const file = this.executeWithBackoff(
        () => fileIterator.next(),
        [],
        'driveRead',
        1
      );

      const filePath = currentPath ? `${currentPath}/${file.getName()}` : file.getName();
      items.push({
        id: file.getId(),
        name: file.getName(),
        type: 'File',
        path: filePath,
        size: file.getSize(),
        parentPath: currentPath
      });
    }

    return items;
  }

  /**
   * Parallel folder scan (simplified for Apps Script limitations)
   */
  parallelFolderScan(folder, currentPath, options) {
    // Apps Script doesn't support true parallelism, but we can optimize batching
    return this.standardFolderScan(folder, currentPath, options);
  }

  /**
   * Update speed metrics
   */
  updateSpeedMetrics(operationCount, processingTime) {
    this.speedMetrics.totalOperations += operationCount;

    const currentTime = new Date();
    const totalTime = currentTime - this.speedMetrics.startTime;

    // Calculate operations per second
    this.speedMetrics.operationsPerSecond =
      (this.speedMetrics.totalOperations / (totalTime / 1000)).toFixed(2);

    this.speedMetrics.lastMeasurement = currentTime;

    // Log performance every 100 operations
    if (this.speedMetrics.totalOperations % 100 === 0) {
      Logger.log(`⚡ Tốc độ: ${this.speedMetrics.operationsPerSecond} thao tác/giây, Tổng: ${this.speedMetrics.totalOperations}`);
    }
  }

  /**
   * Kiểm tra nguy cơ timeout
   * @return {boolean} true nếu có nguy cơ timeout
   */
  checkTimeoutRisk() {
    const currentTime = new Date();
    const executionTime = currentTime - this.executionStartTime;
    const timeLimit = this.config.EXECUTION_TIME_LIMIT_MS || 300000; // 5 phút default

    // Cảnh báo khi đạt 80% thời gian
    const warningThreshold = timeLimit * 0.8;

    if (executionTime > warningThreshold) {
      const remainingTime = timeLimit - executionTime;
      Logger.log(`⚠️ Cảnh báo timeout: đã trôi qua ${Math.round(executionTime / 1000)}s, còn lại ${Math.round(remainingTime / 1000)}s`);

      // Trả về true nếu còn ít hơn 30 giây
      return remainingTime < 30000;
    }

    return false;
  }

  /**
   * Flush all pending operations với timeout protection
   */
  flushAll() {
    Logger.log("🚀 Đang xử lý tất cả thao tác đang chờ...");

    // Kiểm tra timeout risk trước khi flush
    if (this.checkTimeoutRisk()) {
      Logger.log("⚠️ Phát hiện nguy cơ timeout, thực hiện xử lý khẩn cấp...");
      // Chỉ flush priority operations
      const priorityValues = this.priorityQueue.filter(op => op.type === 'values');
      const priorityFormats = this.priorityQueue.filter(op => op.type === 'format');

      if (priorityValues.length > 0) {
        Logger.log(`🚨 Xử lý khẩn cấp ${priorityValues.length} thao tác giá trị ưu tiên`);
        this.flushSheetValueUpdates();
      }

      if (priorityFormats.length > 0 && priorityFormats.length <= 50) {
        Logger.log(`🚨 Xử lý khẩn cấp ${priorityFormats.length} thao tác định dạng ưu tiên`);
        this.flushSheetFormatUpdates();
      }

      return;
    }

    this.flushSheetValueUpdates();
    this.flushSheetFormatUpdates();

    Logger.log("✅ Đã xử lý xong tất cả thao tác");
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    const currentTime = new Date();
    const totalTime = currentTime - this.startTime;
    const totalMinutes = totalTime / (1000 * 60);

    let report = "📊 BÁO CÁO HIỆU SUẤT \n";

    // API Statistics
    report += "🔌 THỐNG KÊ API:\n";
    report += `- Tổng: ${this.apiCallCount}\n`;
    report += `- Drive Đọc: ${this.apiCounters.driveRead}\n`;
    report += `- Drive Ghi: ${this.apiCounters.driveWrite}\n`;
    report += `- Sheets Đọc: ${this.apiCounters.sheetsRead}\n`;
    report += `- Sheets Ghi: ${this.apiCounters.sheetsWrite}\n`;
    report += `- Tốc độ: ${(this.apiCallCount / totalMinutes).toFixed(2)} lời gọi/phút\n\n`;

    // Speed Metrics
    report += "⚡ THỐNG KÊ TỐC ĐỘ:\n";
    report += `- Thao tác/giây: ${this.speedMetrics.operationsPerSecond}\n`;
    report += `- Tổng thao tác: ${this.speedMetrics.totalOperations}\n`;
    report += `- Tỷ lệ cache hit: ${this.speedMetrics.cacheHitRate}\n\n`;

    // Batch Statistics
    report += "📦 THAO TÁC BATCH:\n";
    report += `- Thành công: ${this.operationStats.successfulOperations}\n`;
    report += `- Thất bại: ${this.operationStats.failedOperations}\n`;
    report += `- Tỷ lệ thành công: ${((this.operationStats.successfulOperations / (this.operationStats.successfulOperations + this.operationStats.failedOperations)) * 100).toFixed(2)}%\n\n`;

    return report;
  }

  /**
   * Batch update metadata counters với tối ưu hóa
   * @param {Sheet} sheet - Google Sheet object
   * @param {Object} metadataUpdates - Object chứa các updates {totalFiles, runCount, copiedFiles}
   */
  updateMetadataBatch(sheet, metadataUpdates) {
    try {
      const updates = [];

      // Chuẩn bị batch updates cho metadata
      if (metadataUpdates.totalFiles !== undefined) {
        updates.push({
          range: "D2",
          values: [[metadataUpdates.totalFiles]]
        });
      }

      if (metadataUpdates.runCount !== undefined) {
        updates.push({
          range: "D3",
          values: [[metadataUpdates.runCount]]
        });
      }

      if (metadataUpdates.copiedFiles !== undefined) {
        updates.push({
          range: "D4",
          values: [[metadataUpdates.copiedFiles]]
        });
      }

      // Batch tất cả metadata updates
      updates.forEach(update => {
        this.addSheetValueUpdate(
          sheet,
          update.range,
          update.values,
          true // High priority cho metadata
        );
      });

      this.flushAll();
      Logger.log(`📊 Đã batch update ${updates.length} metadata counters`);

    } catch (error) {
      Logger.log("❌ Lỗi khi batch update metadata: " + error.toString());
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.flushAll();
    this.cache.folderStructure.clear();
    this.cache.fileMetadata.clear();
    this.cache.duplicateChecks.clear();

    Logger.log("🧹 PerformanceEngine đã hoàn thành dọn dẹp");
  }
}

// Global instance
let globalPerformanceEngine = null;

/**
 * Get global PerformanceEngine instance
 */
function getPerformanceEngine() {
  if (!globalPerformanceEngine) {
    globalPerformanceEngine = new PerformanceEngine();
  }
  return globalPerformanceEngine;
}

// Backward compatibility functions
function getPerformanceManager() {
  return getPerformanceEngine();
}

function getBatchManager() {
  return getPerformanceEngine();
}

function getSpeedOptimizer() {
  return getPerformanceEngine();
}

/**
 * Helper function for API calls with performance management
 */
function performApiCall(apiFunction, args = [], apiType = 'driveRead') {
  const engine = getPerformanceEngine();
  return engine.executeWithBackoff(apiFunction, args, apiType);
}
