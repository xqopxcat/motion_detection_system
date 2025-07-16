import React, { useState } from 'react';
import './ActionDataPanel.scss';

const joints = [
    'LeftKnee', 'RightKnee', 'LeftElbow', 'RightElbow', // 可依實際骨架命名擴充
];

// 科技感樣式
const techStyles = {
    panel: {
        position: 'fixed',
        right: '20px',
        top: '20px',
        height: 'calc(100vh - 40px)',
        width: '320px',
        background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.9) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
        color: '#e0e0e0',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        transition: 'all 0.3s ease',
        zIndex: 998,
        overflowY: 'auto',
        overflowX: 'hidden'
    },
    panelCollapsed: {
        position: 'fixed',
        right: '20px',
        top: '20px',
        width: '50px',
        height: '60px',
        background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.9) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '12px',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
        zIndex: 998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#00ffff',
        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
        letterSpacing: '0.5px'
    },
    toggleButton: {
        background: 'linear-gradient(145deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.2))',
        border: '1px solid rgba(0, 255, 255, 0.4)',
        borderRadius: '6px',
        color: '#00ffff',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '4px 8px',
        transition: 'all 0.3s ease',
        minWidth: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    content: {
        animation: 'slideIn 0.3s ease'
    },
    jointSelector: {
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    label: {
        fontSize: '12px',
        color: '#00ffff',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    select: {
        background: 'rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '6px',
        color: '#e0e0e0',
        padding: '8px 12px',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.3s ease'
    },
    dataRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
        fontSize: '13px'
    },
    dataLabel: {
        color: '#00ffff',
        fontWeight: '500',
    },
    dataValue: {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '12px',
        textAlign: 'right',
        flex: '1'
    }
};

export default function ActionDataPanel({
    showActionPanel, // 控制面板顯示
    onToggleActionPanel, // 切換面板顯示狀態的
    frameData, // 當前幀的數據
    onJointChange,
    onComparedJointChange,
    selectedJoint,
    comparedJoint,
    jointsList = joints
}) {
    return (
        <div style={showActionPanel ? techStyles.panel : techStyles.panelCollapsed} className="action-data-panel tech-panel">
            {!showActionPanel ? (
                // 收合狀態：只顯示展開按鈕
                <button
                    style={techStyles.toggleButton}
                    className="toggle-panel-btn tech-button"
                    onClick={onToggleActionPanel}
                    aria-label="顯示面板"
                    onMouseEnter={(e) => {
                        e.target.style.background = 'linear-gradient(145deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 255, 0.3))';
                        e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)';
                        e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(145deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.2))';
                        e.target.style.boxShadow = 'none';
                        e.target.style.transform = 'scale(1)';
                    }}
                >
                    +
                </button>
            ) : (
                // 展開狀態：顯示完整內容
                <>
                    <div style={techStyles.title} className="panel-title">
                        <span>動作數據</span>
                        <button
                            style={techStyles.toggleButton}
                            className="toggle-panel-btn tech-button"
                            onClick={onToggleActionPanel}
                            aria-label="隱藏面板"
                            onMouseEnter={(e) => {
                                e.target.style.background = 'linear-gradient(145deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 255, 0.3))';
                                e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)';
                                e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'linear-gradient(145deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.2))';
                                e.target.style.boxShadow = 'none';
                                e.target.style.transform = 'scale(1)';
                            }}
                        >
                            −
                        </button>
                    </div>
                    <div style={techStyles.content} className="panel-content">
                        <div style={techStyles.jointSelector} className="joint-selector">
                            <label style={techStyles.label} className="select-joint">選擇關節：</label>
                            <select
                                style={techStyles.select}
                                value={selectedJoint}
                                onChange={e => onJointChange(e.target.value)}
                                onFocus={(e) => e.target.style.borderColor = 'rgba(0, 255, 255, 0.6)'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(0, 255, 255, 0.3)'}
                            >
                                {jointsList.map((joint, index) => (
                                    <option key={`${joint}-${index}`} value={joint}>{joint}</option>
                                ))}
                            </select>
                        </div>
                        <div style={techStyles.jointSelector} className="joint-selector">
                            <label style={techStyles.label} className="compared-joint">相對關節：</label>
                            <select
                                style={techStyles.select}
                                value={comparedJoint}
                                onChange={e => onComparedJointChange(e.target.value)}
                                onFocus={(e) => e.target.style.borderColor = 'rgba(0, 255, 255, 0.6)'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(0, 255, 255, 0.3)'}
                            >
                                {jointsList.map((joint, index) => (
                                    <option key={`${joint}-${index}`} value={joint}>{joint}</option>
                                ))}
                            </select>
                        </div>
                        <div style={techStyles.dataRow} className="data-row">
                            <strong style={techStyles.dataLabel}>重心座標：</strong>
                            <span style={techStyles.dataValue}>
                                X: {frameData.centerX}&nbsp;
                                Y: {frameData.centerY}&nbsp;
                                Z: {frameData.centerZ}
                            </span>
                        </div>
                        <div style={techStyles.dataRow} className="data-row">
                            <strong style={techStyles.dataLabel}>重心移動距離：</strong>
                            <span style={techStyles.dataValue}>
                                {frameData.centerMove}
                            </span>
                        </div>
                        <div style={techStyles.dataRow} className="data-row">
                            <strong style={techStyles.dataLabel}>重心移動方向：</strong>
                            <span style={techStyles.dataValue}>
                                X: {frameData.centerDirection.x.toFixed(2)}&nbsp;
                                Y: {frameData.centerDirection.y.toFixed(2)}&nbsp;
                                Z: {frameData.centerDirection.z.toFixed(2)}
                            </span>
                        </div>
                        <div style={techStyles.dataRow} className="data-row">
                            <strong style={techStyles.dataLabel}>身體軸心傾斜角：</strong>
                            <span style={techStyles.dataValue}>{frameData.inclination}°</span>
                        </div>
                        <div style={techStyles.dataRow} className="data-row">
                            <strong style={techStyles.dataLabel} className='distance' data-full-text={`${selectedJoint}的姿態差異角度`}>
                                {`${selectedJoint}的姿態差異角度`}
                            </strong>
                            <span style={techStyles.dataValue}>{frameData.angle}°</span>
                        </div>
                        <div style={techStyles.dataRow} className="data-row">
                            <strong style={techStyles.dataLabel} className='distance' data-full-text={`${selectedJoint}的姿態差異分量`}>
                                {`${selectedJoint}的姿態差異分量`}
                            </strong>
                            <span style={techStyles.dataValue}>
                                X: {frameData.angleX}&nbsp;
                                Y: {frameData.angleY}&nbsp;
                                Z: {frameData.angleZ}
                            </span>
                        </div>
                        <div style={techStyles.dataRow} className="data-row">
                            <strong style={techStyles.dataLabel} className='distance' data-full-text={`${selectedJoint}對${comparedJoint}距離`}>
                                {`${selectedJoint}對${comparedJoint}距離：`}
                            </strong>
                            <span style={techStyles.dataValue}>{frameData.jointDistance}</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}