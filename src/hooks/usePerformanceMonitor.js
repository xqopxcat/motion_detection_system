/**
 * 效能監控 Hook
 * 監控幀率、延遲、資源使用等指標
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export const usePerformanceMonitor = (targetFPS = 30) => {
    const [metrics, setMetrics] = useState({
        fps: 0,
        avgLatency: 0,
        frameDrops: 0,
        cpuUsage: 0,
        memoryUsage: 0
    });

    const lastFrameTime = useRef(Date.now());
    const frameCount = useRef(0);
    const frameDropCount = useRef(0);
    const latencyHistory = useRef([]);
    const frameTimeHistory = useRef([]);

    // 記錄幀處理開始時間
    const startFrameProcessing = useCallback(() => {
        return Date.now();
    }, []);

    // 記錄幀處理結束，計算延遲
    const endFrameProcessing = useCallback((startTime) => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        // 記錄延遲歷史（保留最近 30 筆記錄）
        latencyHistory.current.push(latency);
        if (latencyHistory.current.length > 30) {
            latencyHistory.current.shift();
        }

        // 計算幀間隔
        const now = Date.now();
        const frameInterval = now - lastFrameTime.current;
        frameTimeHistory.current.push(frameInterval);
        if (frameTimeHistory.current.length > 30) {
            frameTimeHistory.current.shift();
        }

        // 檢測掉幀（幀間隔超過目標時間的 1.5 倍）
        const targetInterval = 1000 / targetFPS;
        if (frameInterval > targetInterval * 1.5) {
            frameDropCount.current++;
        }

        frameCount.current++;
        lastFrameTime.current = now;

        return latency;
    }, [targetFPS]);

    // 計算當前 FPS
    const getCurrentFPS = useCallback(() => {
        if (frameTimeHistory.current.length < 2) return 0;
        
        const avgInterval = frameTimeHistory.current.reduce((sum, interval) => sum + interval, 0) / frameTimeHistory.current.length;
        return Math.round(1000 / avgInterval);
    }, []);

    // 計算平均延遲
    const getAverageLatency = useCallback(() => {
        if (latencyHistory.current.length === 0) return 0;
        
        return Math.round(latencyHistory.current.reduce((sum, latency) => sum + latency, 0) / latencyHistory.current.length);
    }, []);

    // 獲取記憶體使用情況（如果支援）
    const getMemoryUsage = useCallback(() => {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024), // MB
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) // MB
            };
        }
        return null;
    }, []);

    // 建議的優化策略
    const getOptimizationSuggestions = useCallback(() => {
        const suggestions = [];
        const currentFPS = getCurrentFPS();
        const avgLatency = getAverageLatency();

        if (currentFPS < targetFPS * 0.8) {
            suggestions.push({
                type: 'fps',
                message: `FPS 過低 (${currentFPS}/${targetFPS})，建議降低檢測頻率或模型精度`,
                action: 'reduce_frequency'
            });
        }

        if (avgLatency > 50) {
            suggestions.push({
                type: 'latency',
                message: `延遲過高 (${avgLatency}ms)，建議使用 WebWorker 或降低解析度`,
                action: 'reduce_latency'
            });
        }

        if (frameDropCount.current / frameCount.current > 0.1) {
            suggestions.push({
                type: 'frame_drops',
                message: `掉幀率過高 (${Math.round(frameDropCount.current / frameCount.current * 100)}%)`,
                action: 'optimize_processing'
            });
        }

        const memory = getMemoryUsage();
        if (memory && memory.used / memory.limit > 0.8) {
            suggestions.push({
                type: 'memory',
                message: `記憶體使用過高 (${memory.used}MB/${memory.limit}MB)`,
                action: 'reduce_memory'
            });
        }

        return suggestions;
    }, [targetFPS, getCurrentFPS, getAverageLatency, getMemoryUsage]);

    // 定期更新指標
    useEffect(() => {
        const updateMetrics = () => {
            setMetrics({
                fps: getCurrentFPS(),
                avgLatency: getAverageLatency(),
                frameDrops: frameDropCount.current,
                frameDropRate: frameCount.current > 0 ? Math.round(frameDropCount.current / frameCount.current * 100) : 0,
                totalFrames: frameCount.current,
                memory: getMemoryUsage()
            });
        };

        const interval = setInterval(updateMetrics, 1000);
        return () => clearInterval(interval);
    }, [getCurrentFPS, getAverageLatency, getMemoryUsage]);

    // 重置統計
    const resetStats = useCallback(() => {
        frameCount.current = 0;
        frameDropCount.current = 0;
        latencyHistory.current = [];
        frameTimeHistory.current = [];
        lastFrameTime.current = Date.now();
    }, []);

    return {
        metrics,
        startFrameProcessing,
        endFrameProcessing,
        getOptimizationSuggestions,
        resetStats
    };
};
