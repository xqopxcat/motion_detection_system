/**
 * 即時效能優化器
 * 根據系統狀態自動調整檢測參數以獲得最佳效能
 */
import { useEffect, useRef, useCallback } from 'react';

export const useRealTimeOptimizer = (performanceMetrics, setOptimizationParams) => {
    const optimizationHistoryRef = useRef([]);
    const lastOptimizationTimeRef = useRef(0);
    const consecutiveLowPerformanceRef = useRef(0);
    const optimizationIntervalRef = useRef(null);

    // 優化參數
    const optimizationRules = {
        // FPS 優化
        fps: {
            target: 30,
            min: 15,
            max: 60,
            threshold: 0.8 // 低於目標的 80% 時觸發優化
        },
        // 延遲優化
        latency: {
            target: 33, // 33ms for 30fps
            max: 100,
            threshold: 1.5 // 超過目標的 1.5 倍時觸發優化
        },
        // 記憶體優化
        memory: {
            threshold: 0.8 // 使用超過 80% 時觸發優化
        },
        // 掉幀優化
        frameDrops: {
            threshold: 0.1 // 掉幀率超過 10% 時觸發優化
        }
    };

    // 分析效能指標並生成優化建議
    const analyzePerformance = useCallback((metrics) => {
        const issues = [];
        const optimizations = {};

        // 檢查 FPS
        if (metrics.fps < optimizationRules.fps.target * optimizationRules.fps.threshold) {
            issues.push({
                type: 'fps',
                severity: metrics.fps < optimizationRules.fps.min ? 'critical' : 'warning',
                value: metrics.fps,
                target: optimizationRules.fps.target
            });
            
            // FPS 優化策略
            if (metrics.fps < optimizationRules.fps.min) {
                optimizations.enablePerformanceMode = true;
                optimizations.targetFPS = Math.max(optimizationRules.fps.min, metrics.fps + 5);
                optimizations.useAdaptiveFPS = true;
            }
        }

        // 檢查延遲
        if (metrics.avgLatency > optimizationRules.latency.target * optimizationRules.latency.threshold) {
            issues.push({
                type: 'latency',
                severity: metrics.avgLatency > optimizationRules.latency.max ? 'critical' : 'warning',
                value: metrics.avgLatency,
                target: optimizationRules.latency.target
            });
            
            // 延遲優化策略
            optimizations.lowLatencyMode = true;
            optimizations.useWebWorker = true;
            if (metrics.avgLatency > optimizationRules.latency.max) {
                optimizations.targetFPS = Math.max(15, optimizations.targetFPS - 5);
            }
        }

        // 檢查記憶體
        if (metrics.memory && metrics.memory.used / metrics.memory.limit > optimizationRules.memory.threshold) {
            issues.push({
                type: 'memory',
                severity: 'warning',
                value: metrics.memory.used,
                limit: metrics.memory.limit
            });
            
            optimizations.enableMemoryOptimization = true;
            optimizations.reduceBufferSize = true;
        }

        // 檢查掉幀率
        if (metrics.frameDropRate && metrics.frameDropRate > optimizationRules.frameDrops.threshold * 100) {
            issues.push({
                type: 'frameDrops',
                severity: 'warning',
                value: metrics.frameDropRate,
                threshold: optimizationRules.frameDrops.threshold * 100
            });
            
            optimizations.reduceProcessingLoad = true;
            optimizations.targetFPS = Math.max(15, (optimizations.targetFPS || 30) - 3);
        }

        return { issues, optimizations };
    }, []);

    // 應用優化設置
    const applyOptimizations = useCallback((optimizations) => {
        const now = Date.now();
        
        // 限制優化頻率（至少間隔 5 秒）
        if (now - lastOptimizationTimeRef.current < 5000) {
            return;
        }

        // 記錄優化歷史
        optimizationHistoryRef.current.push({
            timestamp: now,
            optimizations: { ...optimizations }
        });

        // 保持歷史記錄在合理範圍內
        if (optimizationHistoryRef.current.length > 10) {
            optimizationHistoryRef.current.shift();
        }

        // 應用優化參數
        setOptimizationParams(prevParams => ({
            ...prevParams,
            ...optimizations,
            lastOptimized: now
        }));

        lastOptimizationTimeRef.current = now;

        console.log('🔧 應用效能優化:', optimizations);
    }, [setOptimizationParams]);

    // 智能恢復策略
    const attemptRecovery = useCallback((metrics) => {
        const { issues } = analyzePerformance(metrics);
        
        if (issues.length > 0) {
            consecutiveLowPerformanceRef.current++;
            
            // 連續多次效能問題時，採用更激進的優化
            if (consecutiveLowPerformanceRef.current >= 3) {
                const aggressiveOptimizations = {
                    enablePerformanceMode: true,
                    lowLatencyMode: true,
                    targetFPS: 20, // 降低到較低但穩定的 FPS
                    useWebWorker: true,
                    reduceModelAccuracy: true
                };
                
                applyOptimizations(aggressiveOptimizations);
                consecutiveLowPerformanceRef.current = 0; // 重置計數器
            }
        } else {
            // 效能恢復正常，重置計數器
            consecutiveLowPerformanceRef.current = 0;
            
            // 如果效能良好，可以嘗試提升品質
            if (metrics.fps > optimizationRules.fps.target * 1.2 && 
                metrics.avgLatency < optimizationRules.latency.target * 0.8) {
                
                const qualityImprovements = {
                    targetFPS: Math.min(optimizationRules.fps.max, metrics.fps + 5),
                    reduceModelAccuracy: false
                };
                
                applyOptimizations(qualityImprovements);
            }
        }
    }, [analyzePerformance, applyOptimizations]);

    // 定期優化檢查
    useEffect(() => {
        optimizationIntervalRef.current = setInterval(() => {
            if (performanceMetrics) {
                const { issues, optimizations } = analyzePerformance(performanceMetrics);
                
                if (issues.length > 0 && Object.keys(optimizations).length > 0) {
                    applyOptimizations(optimizations);
                }
                
                // 嘗試智能恢復
                attemptRecovery(performanceMetrics);
            }
        }, 2000); // 每 2 秒檢查一次

        return () => {
            if (optimizationIntervalRef.current) {
                clearInterval(optimizationIntervalRef.current);
            }
        };
    }, [performanceMetrics, analyzePerformance, applyOptimizations, attemptRecovery]);

    // 手動觸發優化
    const manualOptimize = useCallback((targetLevel = 'balanced') => {
        const presets = {
            performance: {
                enablePerformanceMode: true,
                lowLatencyMode: true,
                targetFPS: 20,
                useWebWorker: true,
                reduceModelAccuracy: true
            },
            balanced: {
                enablePerformanceMode: true,
                lowLatencyMode: false,
                targetFPS: 30,
                useWebWorker: true,
                reduceModelAccuracy: false
            },
            quality: {
                enablePerformanceMode: false,
                lowLatencyMode: false,
                targetFPS: 60,
                useWebWorker: false,
                reduceModelAccuracy: false
            }
        };

        applyOptimizations(presets[targetLevel] || presets.balanced);
    }, [applyOptimizations]);

    // 獲取優化歷史和建議
    const getOptimizationInfo = useCallback(() => {
        const currentMetrics = performanceMetrics || {};
        const { issues, optimizations } = analyzePerformance(currentMetrics);
        
        return {
            currentIssues: issues,
            suggestedOptimizations: optimizations,
            optimizationHistory: optimizationHistoryRef.current,
            consecutiveLowPerformance: consecutiveLowPerformanceRef.current
        };
    }, [performanceMetrics, analyzePerformance]);

    // 重置優化狀態
    const resetOptimization = useCallback(() => {
        optimizationHistoryRef.current = [];
        consecutiveLowPerformanceRef.current = 0;
        lastOptimizationTimeRef.current = 0;
        
        // 重置為預設值
        setOptimizationParams({
            enablePerformanceMode: false,
            lowLatencyMode: false,
            targetFPS: 30,
            useWebWorker: false,
            lastOptimized: null
        });
    }, [setOptimizationParams]);

    return {
        manualOptimize,
        getOptimizationInfo,
        resetOptimization,
        analyzePerformance
    };
};
