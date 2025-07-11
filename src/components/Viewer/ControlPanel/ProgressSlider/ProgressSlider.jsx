import React from 'react'
import './ProgressSlider.scss';

const ProgressSlider = ({ progress, setProgress, mixerRef }) => {
    return (
        <div className="progress-slider-container">
            <label className="progress-slider-label">
                進度: <span className="progress-slider-value">{(progress * 100).toFixed(1)}%</span>
            </label>
            <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={progress}
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setProgress(val);
                    if (mixerRef.current) {
                        const clip = mixerRef.current._actions[0]?._clip;
                        if (clip) {
                            mixerRef.current.setTime(val * clip.duration);
                        }
                    }
                }}
                className="progress-slider-input"
            />
        </div>
    );
}

export default ProgressSlider