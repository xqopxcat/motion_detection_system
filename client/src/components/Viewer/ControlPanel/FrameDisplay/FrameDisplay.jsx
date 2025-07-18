import React from 'react';
import './FrameDisplay.scss';

const FrameDisplay = ({ frameNumber }) => {
    return (
        <div className="frame-display">
            <b className="frame-label">Frame:</b>
            <span className="frame-value">{frameNumber}</span>
        </div>
    );
}

export default FrameDisplay;