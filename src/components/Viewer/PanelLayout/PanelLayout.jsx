import React from 'react';
import './PanelLayout.scss';

const PanelLayout = ({ 
    leftPanel, 
    rightPanel, 
    children
}) => {
    return (
        <div className="panel-layout">
            <div className="panel left-panel">
                {leftPanel || children}
            </div>
            {rightPanel && (
                <div className="panel right-panel">
                    {rightPanel}
                </div>
            )}
        </div>
    );
};

export default PanelLayout;