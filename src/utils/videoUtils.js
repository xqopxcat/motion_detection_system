/**
 * 安全的視頻播放工具
 * 用於處理視頻元素的播放和錯誤恢復
 */

/**
 * 安全地播放視頻元素
 * @param {HTMLVideoElement} videoElement - 視頻元素
 * @param {MediaStream} stream - 媒體流
 * @param {string} label - 攝像頭標籤（用於調試）
 * @returns {Promise} 播放成功的 Promise
 */
export const safePlayVideo = async (videoElement, stream, label = '攝像頭') => {
    return new Promise((resolve, reject) => {
        let resolved = false;
        let playPromise = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                cleanup();
                reject(new Error(`${label} 播放超時`));
            }
        }, 15000); // 增加超時時間到15秒

        const cleanup = () => {
            if (videoElement) {
                videoElement.removeEventListener('loadeddata', onLoadedData);
                videoElement.removeEventListener('canplay', onCanPlay);
                videoElement.removeEventListener('playing', onPlaying);
                videoElement.removeEventListener('error', onError);
                videoElement.removeEventListener('abort', onAbort);
                videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
            }
            clearTimeout(timeoutId);
        };

        const onLoadedMetadata = () => {
            console.log(`${label}: loadedmetadata 事件觸發`);
        };

        const onLoadedData = () => {
            console.log(`${label}: loadeddata 事件觸發`);
        };

        const onCanPlay = () => {
            console.log(`${label}: canplay 事件觸發`);
            // 在 canplay 事件時嘗試播放
            attemptPlay();
        };

        const onPlaying = () => {
            console.log(`${label}: playing 事件觸發`);
            if (!resolved) {
                resolved = true;
                cleanup();
                resolve();
            }
        };

        const onError = (event) => {
            console.error(`${label}: 錯誤事件:`, event);
            if (!resolved) {
                resolved = true;
                cleanup();
                reject(new Error(`${label} 播放錯誤: ${event.message || '未知錯誤'}`));
            }
        };

        const onAbort = (event) => {
            console.warn(`${label}: 播放被中斷:`, event);
            
            // 對於 AbortError，嘗試重試而不是立即失敗
            if (retryCount < maxRetries && !resolved) {
                retryCount++;
                console.log(`${label}: 重試播放 (${retryCount}/${maxRetries})`);
                setTimeout(() => {
                    if (!resolved) {
                        attemptPlay();
                    }
                }, 500 * retryCount); // 遞增延遲
            } else if (!resolved) {
                resolved = true;
                cleanup();
                reject(new Error(`${label} 播放被中斷 (AbortError) - 重試 ${maxRetries} 次後失敗`));
            }
        };

        const attemptPlay = async () => {
            if (resolved || !videoElement || !videoElement.isConnected) {
                return;
            }

            try {
                // 確保視頻元素處於正確狀態
                if (videoElement.readyState < 3) {
                    console.log(`${label}: 等待更多數據載入，當前 readyState: ${videoElement.readyState}`);
                    return;
                }

                // 取消之前的 play promise
                if (playPromise) {
                    try {
                        await playPromise;
                        if (!videoElement.paused) {
                            videoElement.pause();
                        }
                    } catch (error) {
                        console.log(`${label}: 取消之前的播放 promise:`, error.name);
                    }
                    
                    // 等待一段時間讓 pause 完成
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                console.log(`${label}: 嘗試播放 (第 ${retryCount + 1} 次)`);
                playPromise = videoElement.play();
                
                if (playPromise) {
                    await playPromise;
                    console.log(`${label}: 播放成功`);
                }
                
            } catch (error) {
                console.error(`${label}: play() 失敗:`, error);
                
                if (error.name === 'AbortError') {
                    onAbort(error);
                } else if (error.name === 'NotAllowedError') {
                    onError(new Error(`${label} 播放被阻止 - 請檢查瀏覽器設置或用戶互動`));
                } else {
                    onError(error);
                }
            }
        };

        // 檢查視頻元素是否有效
        if (!videoElement || !videoElement.isConnected) {
            reject(new Error(`${label} 視頻元素無效或已從 DOM 中移除`));
            return;
        }

        // 設置事件監聽器
        videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
        videoElement.addEventListener('loadeddata', onLoadedData);
        videoElement.addEventListener('canplay', onCanPlay);
        videoElement.addEventListener('playing', onPlaying);
        videoElement.addEventListener('error', onError);
        videoElement.addEventListener('abort', onAbort);

        // 設置媒體流
        const setupStream = async () => {
            try {
                console.log(`${label}: 設置媒體流`);
                
                // 確保清理之前的狀態
                if (videoElement.srcObject) {
                    console.log(`${label}: 清理之前的媒體流`);
                    const oldStream = videoElement.srcObject;
                    videoElement.srcObject = null;
                    
                    // 停止舊流的軌道
                    if (oldStream && oldStream.getTracks) {
                        oldStream.getTracks().forEach(track => track.stop());
                    }
                    
                    // 等待清理完成
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                // 設置新的媒體流
                videoElement.srcObject = stream;
                
                // 確保視頻元素的設置
                videoElement.muted = true;
                videoElement.playsInline = true;
                videoElement.autoplay = false; // 手動控制播放
                
                // 強制載入
                videoElement.load();
                
            } catch (error) {
                console.error(`${label}: 設置媒體流失敗:`, error);
                onError(error);
            }
        };
        
        setupStream();
    });
};

/**
 * 檢查視頻元素是否準備就緒
 * @param {HTMLVideoElement} videoElement - 視頻元素
 * @returns {boolean} 是否準備就緒
 */
export const isVideoReady = (videoElement) => {
    return videoElement && 
           videoElement.readyState >= 3 && // HAVE_FUTURE_DATA 或更高
           videoElement.videoWidth > 0 && 
           videoElement.videoHeight > 0 &&
           !videoElement.paused &&
           !videoElement.ended;
};

/**
 * 等待視頻元素準備就緒
 * @param {HTMLVideoElement} videoElement - 視頻元素
 * @param {string} label - 攝像頭標籤
 * @param {number} timeout - 超時時間（毫秒）
 * @returns {Promise} 準備就緒的 Promise
 */
export const waitForVideoReady = (videoElement, label = '攝像頭', timeout = 15000) => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const check = () => {
            if (isVideoReady(videoElement)) {
                console.log(`${label}: 視頻準備就緒`, {
                    readyState: videoElement.readyState,
                    videoWidth: videoElement.videoWidth,
                    videoHeight: videoElement.videoHeight,
                    paused: videoElement.paused,
                    ended: videoElement.ended
                });
                resolve();
            } else if (Date.now() - startTime > timeout) {
                console.error(`${label}: 等待超時`, {
                    readyState: videoElement.readyState,
                    videoWidth: videoElement.videoWidth,
                    videoHeight: videoElement.videoHeight,
                    paused: videoElement.paused,
                    ended: videoElement.ended
                });
                reject(new Error(`${label} 等待準備就緒超時`));
            } else {
                setTimeout(check, 100);
            }
        };
        
        check();
    });
};

/**
 * 安全地停止視頻流
 * @param {HTMLVideoElement} videoElement - 視頻元素
 * @param {string} label - 攝像頭標籤
 * @returns {Promise} 停止完成的 Promise
 */
export const stopVideoSafely = async (videoElement, label = '攝像頭') => {
    try {
        if (!videoElement) {
            console.log(`${label}: 視頻元素不存在，跳過停止操作`);
            return;
        }

        console.log(`${label}: 開始停止視頻流`);
        
        // 如果有正在進行的 play() Promise，等待它完成或取消
        if (videoElement.readyState > 0 && !videoElement.paused) {
            try {
                console.log(`${label}: 暫停視頻播放`);
                videoElement.pause();
                
                // 等待暫停完成
                await new Promise(resolve => {
                    const checkPaused = () => {
                        if (videoElement.paused || videoElement.readyState === 0) {
                            resolve();
                        } else {
                            setTimeout(checkPaused, 50);
                        }
                    };
                    checkPaused();
                });
                
            } catch (pauseError) {
                console.warn(`${label}: 暫停視頻時發生錯誤:`, pauseError);
            }
        }
        
        // 停止媒體流
        if (videoElement.srcObject) {
            console.log(`${label}: 停止媒體流軌道`);
            const stream = videoElement.srcObject;
            
            if (stream && stream.getTracks) {
                const tracks = stream.getTracks();
                tracks.forEach(track => {
                    if (track.readyState === 'live') {
                        track.stop();
                        console.log(`${label}: 停止軌道:`, track.kind, track.label);
                    }
                });
            }
            
            // 清除 srcObject
            videoElement.srcObject = null;
        }
        
        // 清除其他屬性
        if (videoElement.src) {
            videoElement.removeAttribute('src');
        }
        
        // 重置視頻元素狀態
        try {
            videoElement.load();
        } catch (loadError) {
            console.warn(`${label}: 重置視頻元素時發生錯誤:`, loadError);
        }
        
        console.log(`${label}: 視頻流已安全停止`);
        
    } catch (error) {
        console.error(`${label}: 停止視頻流時發生錯誤:`, error);
        throw error; // 重新拋出錯誤以便上層處理
    }
};

/**
 * 調試視頻元素狀態
 * @param {HTMLVideoElement} videoElement - 視頻元素
 * @param {string} label - 攝像頭標籤
 */
export const debugVideoState = (videoElement, label = '攝像頭') => {
    if (!videoElement) {
        console.log(`${label}: 視頻元素不存在`);
        return;
    }

    console.log(`${label} 狀態:`, {
        readyState: videoElement.readyState,
        readyStateText: getReadyStateText(videoElement.readyState),
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        currentTime: videoElement.currentTime,
        duration: videoElement.duration,
        paused: videoElement.paused,
        ended: videoElement.ended,
        muted: videoElement.muted,
        volume: videoElement.volume,
        playbackRate: videoElement.playbackRate,
        networkState: videoElement.networkState,
        error: videoElement.error,
        srcObject: !!videoElement.srcObject
    });
};

/**
 * 獲取 readyState 的文字描述
 * @param {number} readyState - readyState 值
 * @returns {string} 文字描述
 */
const getReadyStateText = (readyState) => {
    switch (readyState) {
        case 0: return 'HAVE_NOTHING';
        case 1: return 'HAVE_METADATA';
        case 2: return 'HAVE_CURRENT_DATA';
        case 3: return 'HAVE_FUTURE_DATA';
        case 4: return 'HAVE_ENOUGH_DATA';
        default: return `UNKNOWN(${readyState})`;
    }
};
