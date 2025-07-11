import React, { useState } from 'react';
import './AnnotationPanel.scss';

const AnnotationPanel = ({ annotations, onFocus, onDelete, onEdit }) => {
    const [editIdx, setEditIdx] = useState(null);
    const [editValue, setEditValue] = useState('');

    const handleEdit = (idx, ann) => {
        setEditIdx(idx);
        setEditValue(ann.info.text);
    };

    const handleEditSave = (idx) => {
        if (onEdit) onEdit(idx, editValue);
        setEditIdx(null);
    };

    return (
        <div className="annotation-panel">
            <div className="annotation-panel-title">註解列表</div>
            {annotations.length === 0 && (
                <div className="annotation-empty">尚無註解</div>
            )}
            <ul>
                {annotations.map((ann, idx) => {
                    const { bone, info } = ann;
                    return (
                        <li key={idx} className="annotation-item">
                            {editIdx === idx ? (
                                <>
                                    <input
                                        className="annotation-edit-input"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleEditSave(idx);
                                            if (e.key === 'Escape') setEditIdx(null);
                                        }}
                                        autoFocus
                                    />
                                    <button
                                        className="annotation-save"
                                        onClick={() => handleEditSave(idx)}
                                        title="儲存"
                                    >💾</button>
                                    <button
                                        className="annotation-cancel"
                                        onClick={() => setEditIdx(null)}
                                        title="取消"
                                    >✖</button>
                                </>
                            ) : (
                                <>
                                    <span
                                        className="annotation-text"
                                        onClick={() => onFocus && onFocus(ann)}
                                        title="點擊聚焦"
                                    >
                                        {`${info.frame} ${bone?.name}: ${info.text} `}
                                    </span>
                                    <div>
                                        <button
                                            className="annotation-edit"
                                            onClick={() => handleEdit(idx, ann)}
                                            title="編輯"
                                        >✏️</button>
                                        <button
                                            className="annotation-delete"
                                            onClick={() => onDelete && onDelete(idx)}
                                            title="刪除"
                                        >🗑</button>
                                    </div>
                                </>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    );
};

export default AnnotationPanel;