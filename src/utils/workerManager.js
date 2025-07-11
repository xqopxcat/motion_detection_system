/**
 * WebWorker 管理器
 * 管理多個 WebWorker 實例，處理任務分發和負載均衡
 */

class WorkerManager {
    constructor(maxWorkers = navigator.hardwareConcurrency || 4) {
        this.maxWorkers = Math.min(maxWorkers, 8); // 限制最大 Worker 數量
        this.workers = [];
        this.taskQueue = [];
        this.busyWorkers = new Set();
        this.taskId = 0;
        this.pendingTasks = new Map();
        
        this.initializeWorkers();
    }

    /**
     * 初始化 Worker 池
     */
    initializeWorkers() {
        try {
            for (let i = 0; i < this.maxWorkers; i++) {
                // 創建 Worker URL
                const workerUrl = new URL('../workers/imageProcessor.js', import.meta.url);
                const worker = new Worker(workerUrl);
                
                worker.onmessage = (e) => {
                    this.handleWorkerMessage(worker, e);
                };
                
                worker.onerror = (error) => {
                    console.error(`Worker ${i} 錯誤:`, error);
                    this.handleWorkerError(worker, error);
                };
                
                worker.id = i;
                this.workers.push(worker);
            }
            
            console.log(`已初始化 ${this.workers.length} 個 WebWorker`);
        } catch (error) {
            console.error('初始化 WebWorker 失敗:', error);
            // 降級處理：不使用 WebWorker
            this.workers = [];
        }
    }

    /**
     * 處理 Worker 消息
     */
    handleWorkerMessage(worker, event) {
        const { type, data, error, taskId } = event.data;
        
        // 釋放 Worker
        this.busyWorkers.delete(worker);
        
        // 處理任務結果
        if (this.pendingTasks.has(taskId)) {
            const { resolve, reject } = this.pendingTasks.get(taskId);
            this.pendingTasks.delete(taskId);
            
            if (error) {
                reject(new Error(error));
            } else {
                resolve({ type, data });
            }
        }
        
        // 處理下一個任務
        this.processNextTask();
    }

    /**
     * 處理 Worker 錯誤
     */
    handleWorkerError(worker, error) {
        this.busyWorkers.delete(worker);
        
        // 重啟 Worker
        try {
            worker.terminate();
            const workerUrl = new URL('../workers/imageProcessor.js', import.meta.url);
            const newWorker = new Worker(workerUrl);
            newWorker.id = worker.id;
            newWorker.onmessage = (e) => this.handleWorkerMessage(newWorker, e);
            newWorker.onerror = (e) => this.handleWorkerError(newWorker, e);
            
            const index = this.workers.indexOf(worker);
            this.workers[index] = newWorker;
            
            console.log(`Worker ${worker.id} 已重啟`);
        } catch (restartError) {
            console.error(`重啟 Worker ${worker.id} 失敗:`, restartError);
        }
        
        this.processNextTask();
    }

    /**
     * 獲取可用的 Worker
     */
    getAvailableWorker() {
        return this.workers.find(worker => !this.busyWorkers.has(worker));
    }

    /**
     * 處理下一個任務
     */
    processNextTask() {
        if (this.taskQueue.length === 0) return;
        
        const availableWorker = this.getAvailableWorker();
        if (!availableWorker) return;
        
        const task = this.taskQueue.shift();
        this.busyWorkers.add(availableWorker);
        
        // 發送任務到 Worker
        availableWorker.postMessage({
            ...task.data,
            taskId: task.id
        });
    }

    /**
     * 添加任務到隊列
     */
    addTask(type, data, priority = 0) {
        return new Promise((resolve, reject) => {
            const taskId = ++this.taskId;
            
            const task = {
                id: taskId,
                type,
                data: { type, data },
                priority,
                timestamp: Date.now()
            };
            
            this.pendingTasks.set(taskId, { resolve, reject });
            
            // 按優先級排序插入
            let insertIndex = this.taskQueue.length;
            for (let i = 0; i < this.taskQueue.length; i++) {
                if (this.taskQueue[i].priority < priority) {
                    insertIndex = i;
                    break;
                }
            }
            
            this.taskQueue.splice(insertIndex, 0, task);
            
            // 立即嘗試處理任務
            this.processNextTask();
        });
    }

    /**
     * 影像預處理
     */
    async preprocessFrame(imageData, options = {}) {
        if (this.workers.length === 0) {
            // 降級：主線程處理
            return this.fallbackPreprocess(imageData, options);
        }
        
        try {
            return await this.addTask('PREPROCESS_FRAME', { imageData, options }, 2);
        } catch (error) {
            console.warn('WebWorker 預處理失敗，使用主線程:', error);
            return this.fallbackPreprocess(imageData, options);
        }
    }

    /**
     * 影像尺寸調整
     */
    async resizeFrame(imageData, targetWidth, targetHeight, algorithm = 'bilinear') {
        if (this.workers.length === 0) {
            return this.fallbackResize(imageData, targetWidth, targetHeight);
        }
        
        try {
            return await this.addTask('RESIZE_FRAME', {
                imageData,
                targetWidth,
                targetHeight,
                algorithm
            }, 3);
        } catch (error) {
            console.warn('WebWorker 尺寸調整失敗，使用主線程:', error);
            return this.fallbackResize(imageData, targetWidth, targetHeight);
        }
    }

    /**
     * 品質優化
     */
    async optimizeQuality(imageData, options = {}) {
        if (this.workers.length === 0) {
            return { type: 'OPTIMIZE_COMPLETE', data: imageData };
        }
        
        try {
            return await this.addTask('OPTIMIZE_QUALITY', { imageData, options }, 1);
        } catch (error) {
            console.warn('WebWorker 品質優化失敗:', error);
            return { type: 'OPTIMIZE_COMPLETE', data: imageData };
        }
    }

    /**
     * 降級處理：主線程影像預處理
     */
    fallbackPreprocess(imageData, options) {
        // 簡單的主線程處理
        return Promise.resolve({
            type: 'PREPROCESS_COMPLETE',
            data: { imageData, width: imageData.width, height: imageData.height }
        });
    }

    /**
     * 降級處理：主線程尺寸調整
     */
    fallbackResize(imageData, targetWidth, targetHeight) {
        if (imageData.width === targetWidth && imageData.height === targetHeight) {
            return Promise.resolve({
                type: 'RESIZE_COMPLETE',
                data: imageData
            });
        }
        
        // 簡單的 Canvas 縮放
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = imageData.width;
        sourceCanvas.height = imageData.height;
        const sourceCtx = sourceCanvas.getContext('2d');
        sourceCtx.putImageData(imageData, 0, 0);
        
        ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
        const resizedImageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        
        return Promise.resolve({
            type: 'RESIZE_COMPLETE',
            data: resizedImageData
        });
    }

    /**
     * 清理任務隊列
     */
    clearQueue() {
        // 拒絕所有待處理任務
        this.pendingTasks.forEach(({ reject }) => {
            reject(new Error('任務被取消'));
        });
        
        this.taskQueue = [];
        this.pendingTasks.clear();
    }

    /**
     * 獲取統計信息
     */
    getStats() {
        return {
            totalWorkers: this.workers.length,
            busyWorkers: this.busyWorkers.size,
            availableWorkers: this.workers.length - this.busyWorkers.size,
            queueSize: this.taskQueue.length,
            pendingTasks: this.pendingTasks.size
        };
    }

    /**
     * 銷毀所有 Worker
     */
    destroy() {
        this.clearQueue();
        
        this.workers.forEach(worker => {
            try {
                worker.terminate();
            } catch (error) {
                console.warn('終止 Worker 時發生錯誤:', error);
            }
        });
        
        this.workers = [];
        this.busyWorkers.clear();
    }
}

// 創建全局 WorkerManager 實例
let globalWorkerManager = null;

/**
 * 獲取全局 WorkerManager 實例
 */
export const getWorkerManager = () => {
    if (!globalWorkerManager) {
        globalWorkerManager = new WorkerManager();
    }
    return globalWorkerManager;
};

/**
 * 銷毀全局 WorkerManager
 */
export const destroyWorkerManager = () => {
    if (globalWorkerManager) {
        globalWorkerManager.destroy();
        globalWorkerManager = null;
    }
};

export default WorkerManager;
