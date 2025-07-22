import React, { useState } from 'react';
import './AnnotationPanel.scss';

// 科技感樣式
const techStyles = {
    panel: {
        background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.9) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '12px',
        padding: '8px',
        margin: '16px 0',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
        color: '#e0e0e0',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        transition: 'all 0.3s ease'
    },
    title: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#00ffff',
        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
        letterSpacing: '0.5px',
        marginBottom: '16px',
        textAlign: 'center',
        textTransform: 'uppercase'
    },
    empty: {
        textAlign: 'center',
        color: '#888',
        fontStyle: 'italic',
        padding: '20px',
        fontSize: '14px'
    },
    list: {
        listStyle: 'none',
        padding: '0',
        margin: '0'
    },
    item: {
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '8px',
        transition: 'all 0.3s ease',
        position: 'relative'
    },
    itemContent: {
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px'
    },
    itemText: {
        flex: '1',
        fontSize: '14px',
        color: '#e0e0e0',
        wordBreak: 'break-word'
    },
    itemMeta: {
        fontSize: '12px',
        color: '#888',
        marginTop: '4px'
    },
    buttonGroup: {
        display: 'flex',
        gap: '4px',
        flexShrink: 0
    },
    button: {
        background: 'linear-gradient(145deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.2))',
        border: '1px solid rgba(0, 255, 255, 0.4)',
        borderRadius: '4px',
        color: '#00ffff',
        cursor: 'pointer',
        padding: '4px 8px',
        fontSize: '12px',
        transition: 'all 0.3s ease',
        minWidth: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    input: {
        background: 'rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '6px',
        color: '#e0e0e0',
        padding: '8px 12px',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.3s ease',
        width: '100%'
    },
    editContainer: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
    }
};

const AnnotationPanel = ({ annotations, onFocus, onDelete, onEdit }) => {
    const [editId, setEditId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const handleEdit = (id, ann) => {
        setEditId(id);
        setEditValue(ann.text);
    };

    const handleEditSave = (id) => {
        if (onEdit) onEdit(id, editValue);
        setEditId(null);
    };

    return (
        <div style={techStyles.panel} className="annotation-panel tech-panel">
            <div style={techStyles.title} className="annotation-panel-title">註解列表</div>
            {annotations.length === 0 && (
                <div style={techStyles.empty} className="annotation-empty">尚無註解</div>
            )}
            <ul style={techStyles.list}>
                {annotations.map((ann) => {
                    const { _id, jointName, text, frameNumber } = ann;
                    return (
                        <li 
                            key={_id} 
                            style={techStyles.item}
                            className="annotation-item"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                                e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                            }}
                        >
                            {editId === _id ? (
                                <div style={techStyles.editContainer}>
                                    <input
                                        style={techStyles.input}
                                        className="annotation-edit-input"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleEditSave(_id);
                                            if (e.key === 'Escape') setEditId(null);
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = 'rgba(0, 255, 255, 0.6)'}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(0, 255, 255, 0.3)'}
                                        autoFocus
                                    />
                                    <div style={techStyles.buttonGroup}>
                                        <button
                                            style={techStyles.button}
                                            className="annotation-save tech-button"
                                            onClick={() => handleEditSave(_id)}
                                            title="儲存"
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
                                                e.target.style.borderColor = 'rgba(0, 255, 0, 0.4)';
                                                e.target.style.color = '#00ff00';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
                                                e.target.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                                                e.target.style.color = '#00ffff';
                                            }}
                                        >💾</button>
                                        <button
                                            style={techStyles.button}
                                            className="annotation-cancel tech-button"
                                            onClick={() => setEditId(null)}
                                            title="取消"
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
                                                e.target.style.borderColor = 'rgba(255, 0, 0, 0.4)';
                                                e.target.style.color = '#ff0000';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
                                                e.target.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                                                e.target.style.color = '#00ffff';
                                            }}
                                        >✖</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={techStyles.itemContent}>
                                    <div style={{ flex: 1 }}>
                                        <div style={techStyles.itemText}>
                                            <strong>{jointName || '未知骨骼'}</strong>: { text }
                                        </div>
                                        <div style={techStyles.itemMeta}>
                                            幀: { frameNumber }
                                        </div>
                                    </div>
                                    <div style={techStyles.buttonGroup}>
                                        <button
                                            style={techStyles.button}
                                            className="annotation-focus tech-button"
                                            onClick={() => onFocus && onFocus(ann)}
                                            title="定位"
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
                                                e.target.style.borderColor = 'rgba(255, 255, 0, 0.4)';
                                                e.target.style.color = '#ffff00';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
                                                e.target.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                                                e.target.style.color = '#00ffff';
                                            }}
                                        >📍</button>
                                        <button
                                            style={techStyles.button}
                                            className="annotation-edit tech-button"
                                            onClick={() => handleEdit(_id, ann)}
                                            title="編輯"
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                                                e.target.style.borderColor = 'rgba(0, 255, 255, 0.6)';
                                                e.target.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.4)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
                                                e.target.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        >✏️</button>
                                        <button
                                            style={techStyles.button}
                                            className="annotation-delete tech-button"
                                            onClick={() => onDelete && onDelete(_id)}
                                            title="刪除"
                                        >🗑️</button>
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default AnnotationPanel;