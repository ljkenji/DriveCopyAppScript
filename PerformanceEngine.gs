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

    // Batch Operations
    this.BATCH_LIMITS = {
      SHEETS_VALUES: this.config.BATCH_SIZE_SHEETS || 2000,
      SHEETS_FORMATS: this.config.BATCH_SIZE_FORMATS || 1000,
      DRIVE_OPERATIONS: this.config.BATCH_SIZE_DRIVE || 200,
      MEMORY_THRESHOLD: this.config.MEMORY_CLEANUP_THRESHOLD || 8000,
      PARALLEL_CHUNKS: this.config.PARALLEL_CHUNKS || 4
    };

    // Batch queues
    this.sheetsValueQueue = [];
    this.sheetsFormatQueue = [];
    this.driveOperationQueue = [];
    this.priorityQueue = [];

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

    Logger.log("🚀 PerformanceEngine v3.0 initialized - Unified performance system enabled");
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

    throw new Error(`API call failed after ${maxRetries} attempts: ${lastError.toString()}`);
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
      Logger.log(`🔍 DEBUG: Added to PRIORITY queue - range: ${range}, values count: ${values.length}, total priority queue: ${this.priorityQueue.length}`);
    } else {
      this.sheetsValueQueue.push(operation);
      Logger.log(`🔍 DEBUG: Added to REGULAR queue - range: ${range}, values count: ${values.length}, total regular queue: ${this.sheetsValueQueue.length}`);
    }

    // Auto-flush if queue is full
    if (this.sheetsValueQueue.length >= this.BATCH_LIMITS.SHEETS_VALUES) {
      this.flushSheetValueUpdates();
    }
  }

  /**
   * Add sheet format update to batch queue
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

    // Auto-flush if queue is full
    if (this.sheetsFormatQueue.length >= this.BATCH_LIMITS.SHEETS_FORMATS) {
      this.flushSheetFormatUpdates();
    }
  }

  /**
   * Flush sheet value updates
   */
  flushSheetValueUpdates() {
    // Combine both regular queue and priority queue
    const allOperations = [...this.priorityQueue.filter(op => op.type === 'values'), ...this.sheetsValueQueue];

    if (allOperations.length === 0) return;

    Logger.log(`🚀 Flushing ${allOperations.length} sheet value updates (${this.priorityQueue.filter(op => op.type === 'values').length} priority + ${this.sheetsValueQueue.length} regular)...`);

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
        Logger.log(`❌ Error flushing sheet values: ${error.toString()}`);
        this.operationStats.failedOperations += operations.length;
      }
    });

    // Clear both queues
    this.sheetsValueQueue = [];
    this.priorityQueue = this.priorityQueue.filter(op => op.type !== 'values'); // Keep non-value operations
    this.operationStats.lastFlushTime = new Date();
  }

  /**
   * Flush sheet format updates
   */
  flushSheetFormatUpdates() {
    // Combine both regular queue and priority queue
    const allFormatOperations = [...this.priorityQueue.filter(op => op.type === 'format'), ...this.sheetsFormatQueue];

    if (allFormatOperations.length === 0) return;

    Logger.log(`🎨 Flushing ${allFormatOperations.length} sheet format updates (${this.priorityQueue.filter(op => op.type === 'format').length} priority + ${this.sheetsFormatQueue.length} regular)...`);

    allFormatOperations.forEach(operation => {
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
        Logger.log(`❌ Error flushing sheet format: ${error.toString()}`);
        this.operationStats.failedOperations++;
      }
    });

    // Clear both queues
    this.sheetsFormatQueue = [];
    this.priorityQueue = this.priorityQueue.filter(op => op.type !== 'format'); // Keep non-format operations
  }

  /**
   * Speed optimized folder scan
   */
  speedOptimizedFolderScan(folder, currentPath = "", options = {}) {
    const startTime = new Date();

    try {
      // Check cache first
      const cacheKey = folder.getId() + "_" + currentPath;
      if (this.SPEED_SETTINGS.SMART_CACHING && this.cache.folderStructure.has(cacheKey)) {
        const cached = this.cache.folderStructure.get(cacheKey);
        if (this.isCacheValid(cached.timestamp)) {
          Logger.log(`⚡ Cache hit for folder scan: ${currentPath || 'root'}`);
          this.speedMetrics.cacheHitRate++;
          return cached.data;
        }
      }

      // Perform optimized scan
      const results = this.SPEED_SETTINGS.PARALLEL_PROCESSING ?
        this.parallelFolderScan(folder, currentPath, options) :
        this.standardFolderScan(folder, currentPath, options);

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
      Logger.log(`❌ Error in speed optimized scan: ${error.toString()}`);
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
      Logger.log(`⚡ Speed: ${this.speedMetrics.operationsPerSecond} ops/sec, Total: ${this.speedMetrics.totalOperations}`);
    }
  }

  /**
   * Flush all pending operations
   */
  flushAll() {
    Logger.log("🚀 Flushing all pending operations...");

    this.flushSheetValueUpdates();
    this.flushSheetFormatUpdates();

    Logger.log("✅ All operations flushed");
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    const currentTime = new Date();
    const totalTime = currentTime - this.startTime;
    const totalMinutes = totalTime / (1000 * 60);

    let report = "📊 PERFORMANCE REPORT \n";

    // API Statistics
    report += "🔌 API CALLS:\n";
    report += `- Total: ${this.apiCallCount}\n`;
    report += `- Drive Read: ${this.apiCounters.driveRead}\n`;
    report += `- Drive Write: ${this.apiCounters.driveWrite}\n`;
    report += `- Sheets Read: ${this.apiCounters.sheetsRead}\n`;
    report += `- Sheets Write: ${this.apiCounters.sheetsWrite}\n`;
    report += `- Rate: ${(this.apiCallCount / totalMinutes).toFixed(2)} calls/min\n\n`;

    // Speed Metrics
    report += "⚡ SPEED METRICS:\n";
    report += `- Operations/sec: ${this.speedMetrics.operationsPerSecond}\n`;
    report += `- Total operations: ${this.speedMetrics.totalOperations}\n`;
    report += `- Cache hit rate: ${this.speedMetrics.cacheHitRate}\n\n`;

    // Batch Statistics
    report += "📦 BATCH OPERATIONS:\n";
    report += `- Successful: ${this.operationStats.successfulOperations}\n`;
    report += `- Failed: ${this.operationStats.failedOperations}\n`;
    report += `- Success rate: ${((this.operationStats.successfulOperations / (this.operationStats.successfulOperations + this.operationStats.failedOperations)) * 100).toFixed(2)}%\n\n`;

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

    Logger.log("🧹 PerformanceEngine cleanup completed");
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
