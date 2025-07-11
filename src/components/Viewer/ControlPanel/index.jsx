import React from 'react';
import './ControlPanel.scss';
import FrameDisplay from "./FrameDisplay/FrameDisplay";
import FrameJumpInput from "./FrameJumpInput/FrameJumpInput";
import PlayPauseButtons from "./PlayPauseButtons/PlayPauseButtons";
import SpeedSlider from "./SpeedSlider/SpeedSlider";
import ProgressSlider from "./ProgressSlider/ProgressSlider";
import AnnotationPanel from "../AnnotationPanel";

// 科技感樣式
const techStyles = {
    container: {
        position: 'fixed',
        left: '20px',
        top: '20px',
        height: 'calc(100vh - 60px)',
        width: '360px',
        background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.9) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
        color: '#e0e0e0',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        transition: 'all 0.3s ease',
        zIndex: 999,
        overflowY: 'auto',
        overflowX: 'hidden'
    },
    containerCollapsed: {
        position: 'fixed',
        left: '20px',
        top: '20px',
        width: '50px',
        height: '60px',
        background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.9) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '12px',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    toggleButton: {
        background: 'linear-gradient(145deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.2))',
        border: '1px solid rgba(0, 255, 255, 0.4)',
        borderRadius: '6px',
        left: '0px',
        top: '0px',
        color: '#00ffff',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '8px 12px',
        transition: 'all 0.3s ease',
        minWidth: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
    },
    title: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#00ffff',
        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
        letterSpacing: '0.5px',
        textAlign: 'left',
        textTransform: 'uppercase'
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflow: 'hidden'
    },
    videoPanelControls: {
        padding: '12px 0',
        borderTop: '1px solid rgba(0, 255, 255, 0.2)'
    },
    videoPanelButton: {
        width: '100%',
        background: 'linear-gradient(145deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.2))',
        border: '1px solid rgba(0, 255, 255, 0.4)',
        borderRadius: '8px',
        color: '#00ffff',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '10px 16px',
        transition: 'all 0.3s ease',
        fontWeight: '500'
    }
};

export default function ControlPanel(props) {
    return (
        <>
            {!props.showControlPanel ? (
                <div style={techStyles.containerCollapsed} className="control-panel-collapsed">
                    <button
                        style={techStyles.toggleButton}
                        className="toggle-control-panel-btn tech-button"
                        onClick={props.onToggleControlPanel}
                        aria-label="展開控制面板"
                        title="展開控制面板"
                        onMouseEnter={(e) => {
                            e.target.style.background = 'linear-gradient(145deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 255, 0.3))';
                            e.target.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4)';
                            e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'linear-gradient(145deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.2))';
                            e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
                            e.target.style.transform = 'scale(1)';
                        }}
                    >
                        ▶
                    </button>
                </div>
            ) : (
                <div style={techStyles.container} className="control-panel-container tech-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={techStyles.title} className="control-panel-title">
                            控制面板
                        </div>
                        <button
                            style={techStyles.toggleButton}
                            className="toggle-control-panel-btn tech-button"
                            onClick={props.onToggleControlPanel}
                            aria-label="收合控制面板"
                            title="收合控制面板"
                            onMouseEnter={(e) => {
                                e.target.style.background = 'linear-gradient(145deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 255, 0.3))';
                                e.target.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4)';
                                e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'linear-gradient(145deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.2))';
                                e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
                                e.target.style.transform = 'scale(1)';
                            }}
                        >
                            ◀
                        </button>
                    </div>
                    <div style={techStyles.content}>
                        <FrameDisplay frameNumber={props.frameNumber} />
                        <FrameJumpInput value={props.frameNumber} mixerRef={props.mixerRef} setFrameNumber={props.setFrameNumber} />
                        <PlayPauseButtons isPaused={props.isPaused} setIsPaused={props.setIsPaused} setFrameStep={props.setFrameStep} />
                        <SpeedSlider speed={props.speed} setSpeed={props.setSpeed} />
                        <ProgressSlider progress={props.progress} setProgress={props.setProgress} mixerRef={props.mixerRef} />
                        <div style={techStyles.videoPanelControls} className="video-panel-controls">
                            <button
                                style={techStyles.videoPanelButton}
                                className="video-panel-toggle-btn tech-button"
                                onClick={props.onToggleVideoPanel}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'linear-gradient(145deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 255, 0.3))';
                                    e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)';
                                    e.target.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'linear-gradient(145deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.2))';
                                    e.target.style.boxShadow = 'none';
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                {props.showVideoPanel ? '隱藏影片面板' : '顯示影片面板'}
                            </button>
                        </div>
                        <AnnotationPanel
                            annotations={props.annotations}
                            onFocus={props.onAnnotationFocus}
                            onDelete={props.onAnnotationDelete}
                            onEdit={props.onAnnotationEdit}
                        />
                    </div>
                </div>
            )}
        </>
    );
}