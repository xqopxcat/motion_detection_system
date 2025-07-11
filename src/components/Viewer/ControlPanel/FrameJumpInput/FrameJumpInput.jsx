import React, { useEffect, useState } from 'react';
import './FrameJumpInput.scss';

const FrameJumpInput = ({ value, mixerRef, setFrameNumber }) => {
    const clip = mixerRef.current?._actions[0]?._clip;
    const fps = 1 / clip?.tracks[0].times[1] - clip?.tracks[0].times[0] || 30;
    const totalFrames = clip ? Math.floor(clip?.duration * fps) : 0;

    const [inputValue, setInputValue] = useState(value);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    return (
        <div className="frame-jump-input-container">
            <label className="frame-jump-label">跳到幀數: </label>
            <input
                type="number"
                value={ inputValue }
                min="0"
                max={totalFrames - 1}
                onChange={e => {
                    let val = e.target.value;
                    if (isNaN(val)) val = 0;
                    if (val < 0) val = 0;
                    if (val > totalFrames - 1) val = totalFrames - 1;
                    setInputValue(val);
                }}
                onKeyDown={e => {
                    if (e.key === 'Enter' && mixerRef.current) {
                        let frame = parseInt(e.target.value, 10);
                        if (isNaN(frame)) frame = 0;
                        if (frame < 0) frame = 0;
                        if (frame > totalFrames - 1) frame = totalFrames - 1;
                        if (clip) {
                            mixerRef.current.setTime(frame / fps);
                            setFrameNumber(frame);
                        }
                    }
                }}
                placeholder="輸入幀數後按 Enter"
                className="frame-jump-input"
            />
        </div>
    );
}

export default FrameJumpInput;