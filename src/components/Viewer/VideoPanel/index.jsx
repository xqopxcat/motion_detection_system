import React, { useRef, useEffect, useState } from 'react';
import './VideoPanel.scss';

// 科技感樣式
const techStyles = {
    panel: {
        background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.9) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        margin: '8px',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
        color: '#e0e0e0',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        transition: 'all 0.3s ease',
        position: 'relative'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '0 0 12px 0',
        borderBottom: '1px solid rgba(0, 255, 255, 0.2)'
    },
    title: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#00ffff',
        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
        letterSpacing: '0.5px',
        textTransform: 'uppercase'
    },
    headerButtons: {
        display: 'flex',
        gap: '8px'
    },
    button: {
        background: 'linear-gradient(145deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.2))',
        border: '1px solid rgba(0, 255, 255, 0.4)',
        borderRadius: '6px',
        color: '#00ffff',
        cursor: 'pointer',
        fontSize: '13px',
        padding: '6px 12px',
        transition: 'all 0.3s ease',
        fontWeight: '500',
        whiteSpace: 'nowrap'
    },
    removeButton: {
        background: 'linear-gradient(145deg, rgba(255, 0, 0, 0.1), rgba(255, 0, 0, 0.2))',
        border: '1px solid rgba(255, 0, 0, 0.4)',
        color: '#ff6b6b'
    },
    closeButton: {
        background: 'linear-gradient(145deg, rgba(255, 255, 0, 0.1), rgba(255, 255, 0, 0.2))',
        border: '1px solid rgba(255, 255, 0, 0.4)',
        color: '#ffff00',
        fontSize: '16px',
        fontWeight: 'bold',
        padding: '4px 8px',
        minWidth: '28px'
    },
    videoContainer: {
        position: 'relative',
        width: '100%',
        marginBottom: '16px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        backgroundColor: '#000'
    },
    video: {
        width: '100%',
        height: 'auto',
        display: 'block',
        backgroundColor: '#000'
    },
    placeholder: {
        textAlign: 'center',
        color: '#888',
        fontStyle: 'italic',
        padding: '60px 20px',
        fontSize: '14px',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '2px dashed rgba(0, 255, 255, 0.3)',
        borderRadius: '8px'
    },
    fileInput: {
        marginTop: '12px',
        padding: '8px',
        background: 'rgba(0, 255, 255, 0.1)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '6px',
        color: '#00ffff',
        fontSize: '13px'
    },
    info: {
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '6px',
        padding: '12px',
        fontSize: '12px',
        color: '#ccc',
        border: '1px solid rgba(0, 255, 255, 0.1)'
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '6px',
        alignItems: 'center'
    },
    infoLabel: {
        color: '#00ffff',
        fontWeight: '500'
    },
    infoValue: {
        color: '#fff',
    },
    debugInfo: {
        fontSize: '10px',
        color: '#666',
        marginTop: '8px',
        padding: '8px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '4px',
        border: '1px solid rgba(0, 255, 255, 0.1)'
    }
};

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
    const fileInputRef = useRef(null);
    const [videoDuration, setVideoDuration] = useState(0);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoSrc) {
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

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);

        if (video.readyState >= 1) {
            setVideoDuration(video.duration);
        }

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [videoSrc, onLoadedMetadata, onTimeUpdate]);

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

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoDuration || currentFrame === undefined) return;

        const fps = 30;
        const targetTime = currentFrame / fps;
        
        if (Math.abs(video.currentTime - targetTime) > 0.1) {
            video.currentTime = targetTime;
        }
    }, [currentFrame, videoDuration]);

    const handleRemoveVideo = () => {
        if (onVideoRemove) {
            onVideoRemove();
        }
        setVideoDuration(0);
        setVideoCurrentTime(0);
    };

    const handleButtonHover = (e, isEnter, type = 'default') => {
        if (type === 'remove') {
            if (isEnter) {
                e.target.style.background = 'linear-gradient(145deg, rgba(255, 0, 0, 0.2), rgba(255, 0, 0, 0.3))';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 15px rgba(255, 0, 0, 0.4)';
            } else {
                e.target.style.background = 'linear-gradient(145deg, rgba(255, 0, 0, 0.1), rgba(255, 0, 0, 0.2))';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
            }
        } else if (type === 'close') {
            if (isEnter) {
                e.target.style.background = 'linear-gradient(145deg, rgba(255, 255, 0, 0.2), rgba(255, 255, 0, 0.3))';
                e.target.style.transform = 'scale(1.1)';
            } else {
                e.target.style.background = 'linear-gradient(145deg, rgba(255, 255, 0, 0.1), rgba(255, 255, 0, 0.2))';
                e.target.style.transform = 'scale(1)';
            }
        } else {
            if (isEnter) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 255, 0.4)';
            } else {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
            }
        }
    };

    return (
        <div style={techStyles.panel} className="video-panel tech-panel">
            <div style={techStyles.header} className="video-header">
                <h3 style={techStyles.title}>影片面板</h3>
                <div style={techStyles.headerButtons} className="header-buttons">
                    {videoSrc && (
                        <button 
                            style={techStyles.removeButton}
                            className="remove-btn tech-button" 
                            onClick={handleRemoveVideo}
                            onMouseEnter={(e) => handleButtonHover(e, true, 'remove')}
                            onMouseLeave={(e) => handleButtonHover(e, false, 'remove')}
                        >
                            移除影片
                        </button>
                    )}
                    {onClose && (
                        <button 
                            style={techStyles.closeButton}
                            className="close-btn tech-button" 
                            onClick={onClose}
                            onMouseEnter={(e) => handleButtonHover(e, true, 'close')}
                            onMouseLeave={(e) => handleButtonHover(e, false, 'close')}
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>
            <div style={techStyles.videoContainer} className="video-container">
                {videoSrc ? (
                    <video 
                        ref={videoRef}
                        src={videoSrc}
                        controls
                        muted
                        style={techStyles.video}
                        className="video-player"
                    />
                ) : (
                    <div style={techStyles.placeholder} className="video-placeholder">
                        <p>請選擇影片檔案</p>
                        <input 
                            ref={fileInputRef}
                            style={techStyles.fileInput}
                            type="file" 
                            accept="video/*" 
                            onChange={onVideoFileChange}
                        />
                    </div>
                )}
            </div>
            
            <div style={techStyles.info} className="video-info">
                <div style={techStyles.infoRow} className="info-row">
                    <span style={techStyles.infoLabel}>時間:</span>
                    <span style={techStyles.infoValue}>
                        {videoCurrentTime.toFixed(2)}s / {videoDuration.toFixed(2)}s
                    </span>
                </div>
                <div style={techStyles.infoRow} className="info-row">
                    <span style={techStyles.infoLabel}>幀數:</span>
                    <span style={techStyles.infoValue}>
                        {Math.floor(videoCurrentTime * 30)}
                    </span>
                </div>
                <div style={techStyles.infoRow} className="info-row">
                    <span style={techStyles.infoLabel}>播放速度:</span>
                    <span style={techStyles.infoValue}>{speed}x</span>
                </div>
                
                <div style={techStyles.debugInfo} className="debug-info">
                    <div>狀態: {videoSrc ? '已載入' : '未載入'}</div>
                    <div>影片時長: {videoDuration.toFixed(2)}s</div>
                    <div>當前時間: {videoCurrentTime.toFixed(2)}s</div>
                    <div>播放狀態: {isPlaying ? '播放中' : '暫停'}</div>
                </div>
            </div>
        </div>
    );
};

export default VideoPanel;