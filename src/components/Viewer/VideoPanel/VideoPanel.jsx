import React, { useRef, useEffect, useState } from 'react';
import './VideoPanel.scss';

const VideoPanel = ({ 
    videoSrc, 
    isPlaying, 
    currentFrame, 
    onTimeUpdate,
    onLoadedMetadata,
    onVideoFileChange,
    onVideoRemove,
    onClose,
    speed = 1.0 
}) => {
    const videoRef = useRef(null);
    const [videoDuration, setVideoDuration] = useState(0);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);

    // 修復：當 videoSrc 改變時，重新綁定事件監聽器
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoSrc) {
            // 如果沒有影片，重置狀態
            setVideoDuration(0);
            setVideoCurrentTime(0);
            return;
        }

        const handleLoadedMetadata = () => {
            setVideoDuration(video.duration);
            if (onLoadedMetadata) {
                onLoadedMetadata({
                    duration: video.duration,
                    fps: 30
                });
            }
        };

        const handleTimeUpdate = () => {
            setVideoCurrentTime(video.currentTime);
            if (onTimeUpdate) {
                onTimeUpdate(video.currentTime);
            }
        };

        const handleCanPlay = () => {
            console.log('Video can play', video.duration);
        };

        // 添加事件監聽器
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('canplay', handleCanPlay);

        // 如果影片已經載入完成，直接設置時長
        if (video.readyState >= 1) {
            setVideoDuration(video.duration);
        }

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, [videoSrc, onLoadedMetadata, onTimeUpdate]); // 添加 videoSrc 依賴

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.play().catch(console.error);
        } else {
            video.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.playbackRate = speed;
    }, [speed]);

    // 根據當前幀更新視頻時間
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoDuration || currentFrame === undefined) return;

        const fps = 30; // 假設 30fps
        const targetTime = currentFrame / fps;
        
        // 只有當時間差異較大時才更新，避免循環更新
        if (Math.abs(video.currentTime - targetTime) > 0.1) {
            video.currentTime = targetTime;
        }
    }, [currentFrame, videoDuration]);

    // 處理移除影片
    const handleRemoveVideo = () => {
        if (onVideoRemove) {
            onVideoRemove();
        }
        // 重置本地狀態
        setVideoDuration(0);
        setVideoCurrentTime(0);
    };

    return (
        <div className="video-panel">
            <div className="video-header">
                <h3>影片面板</h3>
                <div className="header-buttons">
                    {videoSrc && (
                        <button className="remove-btn" onClick={handleRemoveVideo}>
                            移除影片
                        </button>
                    )}
                    {onClose && (
                        <button className="close-btn" onClick={onClose}>
                            ×
                        </button>
                    )}
                </div>
            </div>
            <div className="video-container">
                {videoSrc ? (
                    <video 
                        ref={videoRef}
                        src={videoSrc}
                        controls
                        muted
                        className="video-player"
                        onLoadedMetadata={() => {
                            const video = videoRef.current;
                            if (video) {
                                setVideoDuration(video.duration);
                                console.log('Video duration:', video.duration);
                            }
                        }}
                        onTimeUpdate={() => {
                            const video = videoRef.current;
                            if (video) {
                                setVideoCurrentTime(video.currentTime);
                            }
                        }}
                    />
                ) : (
                    <div className="video-placeholder">
                        <p>請選擇影片檔案</p>
                        <input 
                            type="file" 
                            accept="video/*" 
                            onChange={onVideoFileChange}
                        />
                    </div>
                )}
            </div>
            
            <div className="video-info">
                <div className="time-info">
                    <span>時間: {videoCurrentTime.toFixed(2)}s / {videoDuration.toFixed(2)}s</span>
                </div>
                <div className="frame-info">
                    <span>幀數: {Math.floor(videoCurrentTime * 30)}</span>
                </div>
                {/* 調試信息 */}
                <div className="debug-info" style={{ fontSize: '10px', color: '#999' }}>
                    <div>videoSrc: {videoSrc ? 'loaded' : 'null'}</div>
                    <div>duration: {videoDuration}</div>
                    <div>currentTime: {videoCurrentTime}</div>
                </div>
            </div>
        </div>
    );
};

export default VideoPanel;