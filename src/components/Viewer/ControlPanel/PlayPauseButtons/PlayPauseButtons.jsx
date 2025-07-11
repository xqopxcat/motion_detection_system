import './PlayPauseButtons.scss';

const PlayPauseButtons = ({ isPaused, setIsPaused, setFrameStep }) => {
    return (
        <div className="play-pause-buttons-container">
            <button
                onClick={() => setIsPaused(p => !p)}
                className={`play-pause-btn ${isPaused ? 'play-btn' : 'pause-btn'}`}
            >
                {isPaused ? '▶ 播放' : '⏸ 暫停'}
            </button>
            <button
                onClick={() => setFrameStep(true)}
                className="play-pause-btn play-btn"
            >
                ⏭ 單幀
            </button>
        </div>
    );
}

export default PlayPauseButtons;