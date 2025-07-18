import React from 'react'
import './SpeedSlider.scss';

const SpeedSlider = ({ speed, setSpeed }) => {
    return (
        <div className="speed-slider-container">
            <label className="speed-slider-label">
                播放速率: <span className="speed-slider-value">{speed.toFixed(1)}x</span>
            </label>
            <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
                className="speed-slider-input"
            />
        </div>
    );
}

export default SpeedSlider