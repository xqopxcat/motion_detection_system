import React from 'react';
import './ControlPanel.scss';
import FrameDisplay from "./FrameDisplay/FrameDisplay";
import FrameJumpInput from "./FrameJumpInput/FrameJumpInput";
import PlayPauseButtons from "./PlayPauseButtons/PlayPauseButtons";
import SpeedSlider from "./SpeedSlider/SpeedSlider";
import ProgressSlider from "./ProgressSlider/ProgressSlider";
import AnnotationPanel from "../AnnotationPanel";

export default function ControlPanel(props) {
    return (
        <>
            <button
                className={`toggle-control-panel-btn${props.showControlPanel ? '' : ' collapsed'}`}
                onClick={props.onToggleControlPanel}
                aria-label={props.showControlPanel ? '收合控制面板' : '展開控制面板'}
            >
                {props.showControlPanel ? '◀' : '▶'}
            </button>
            <div className={`control-panel-container${props.showControlPanel ? '' : ' collapsed'}`}>
                <div className="control-panel-title">
                    控制面板
                </div>
                {props.showControlPanel && <>
                    <FrameDisplay frameNumber={props.frameNumber} />
                    <FrameJumpInput value={props.frameNumber} mixerRef={props.mixerRef} setFrameNumber={props.setFrameNumber} />
                    <PlayPauseButtons isPaused={props.isPaused} setIsPaused={props.setIsPaused} setFrameStep={props.setFrameStep} />
                    <SpeedSlider speed={props.speed} setSpeed={props.setSpeed} />
                    <ProgressSlider progress={props.progress} setProgress={props.setProgress} mixerRef={props.mixerRef} />
                    <div className="video-panel-controls">
                        <button
                            className="video-panel-toggle-btn"
                            onClick={props.onToggleVideoPanel}
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
                </>}
            </div>
        </>
    );
}