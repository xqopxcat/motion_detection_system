import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import './MotionDashboard.scss';

// 模擬數據 - 實際使用時應該從 API 獲取
const mockTrainingData = [
  {
    id: '1',
    date: '2025-10-01',
    name: '籃球投籃訓練 #1',
    duration: 120,
    centerMoveAvg: 2.3,
    centerMoveMax: 5.8,
    inclinationAvg: 12.5,
    stabilityScore: 85,
    jointDeviation: 8.2,
    videoUrl: '/videos/training1.mp4',
    annotations: 12
  },
  {
    id: '2',
    date: '2025-10-02',
    name: '籃球投籃訓練 #2',
    duration: 135,
    centerMoveAvg: 2.1,
    centerMoveMax: 4.9,
    inclinationAvg: 11.8,
    stabilityScore: 88,
    jointDeviation: 7.5,
    videoUrl: '/videos/training2.mp4',
    annotations: 8
  },
  {
    id: '3',
    date: '2025-10-03',
    name: '籃球投籃訓練 #3',
    duration: 145,
    centerMoveAvg: 1.9,
    centerMoveMax: 4.2,
    inclinationAvg: 10.5,
    stabilityScore: 92,
    jointDeviation: 6.8,
    videoUrl: '/videos/training3.mp4',
    annotations: 15
  }
];

const StatCard = ({ title, value, unit, trend, isMobile }) => (
  <div className={`stat-card ${isMobile ? 'mobile' : ''}`}>
    <div className="stat-header">
      <h3>{title}</h3>
      {trend && (
        <span className={`trend ${trend > 0 ? 'up' : 'down'}`}>
          {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="stat-value">
      {value} <span className="unit">{unit}</span>
    </div>
  </div>
);

const TrendChart = ({ data, metric, title, isMobile }) => {
  const maxValue = Math.max(...data.map(d => d[metric]));
  const minValue = Math.min(...data.map(d => d[metric]));
  const range = maxValue - minValue;

  return (
    <div className={`trend-chart ${isMobile ? 'mobile' : ''}`}>
      <h3>{title}</h3>
      <div className="chart-container">
        <svg viewBox="0 0 300 150" className="chart-svg">
          {/* 網格線 */}
          <defs>
            <pattern id="grid" width="30" height="15" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 15" fill="none" stroke="rgba(0,255,255,0.1)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="300" height="150" fill="url(#grid)" />
          
          {/* 數據線 */}
          <polyline
            fill="none"
            stroke="#00ffff"
            strokeWidth="2"
            points={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 280 + 10;
              const y = 140 - ((d[metric] - minValue) / range) * 120;
              return `${x},${y}`;
            }).join(' ')}
          />
          
          {/* 數據點 */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 280 + 10;
            const y = 140 - ((d[metric] - minValue) / range) * 120;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill="#00ffff"
                stroke="#fff"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        <div className="chart-labels">
          {data.map((d, i) => (
            <span key={i} className="label">
              {new Date(d.date).getDate()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const TrainingRecord = ({ record, onView, onCompare, isMobile }) => (
  <div className={`training-record ${isMobile ? 'mobile' : ''}`}>
    <div className="record-header">
      <div className="record-info">
        <h4>{record.name}</h4>
        <span className="date">{new Date(record.date).toLocaleDateString('zh-TW')}</span>
      </div>
      <div className="record-actions">
        <button 
          className="btn-primary"
          onClick={() => onView(record.id)}
        >
          {isMobile ? '檢視' : '詳細檢視'}
        </button>
        <button 
          className="btn-secondary"
          onClick={() => onCompare(record.id)}
        >
          {isMobile ? '對比' : '對比分析'}
        </button>
      </div>
    </div>
    
    <div className="record-metrics">
      <div className="metric">
        <span className="label">重心移動</span>
        <span className="value">{record.centerMoveAvg}m</span>
      </div>
      <div className="metric">
        <span className="label">傾斜角</span>
        <span className="value">{record.inclinationAvg}°</span>
      </div>
      <div className="metric">
        <span className="label">穩定性</span>
        <span className="value">{record.stabilityScore}%</span>
      </div>
      <div className="metric">
        <span className="label">註解</span>
        <span className="value">{record.annotations}</span>
      </div>
    </div>
    
    <div className="record-footer">
      <span className="duration">時長: {Math.floor(record.duration / 60)}:{(record.duration % 60).toString().padStart(2, '0')}</span>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${record.stabilityScore}%` }}
        ></div>
      </div>
    </div>
  </div>
);

const MotionDashboard = () => {
  const navigate = useNavigate();
  const { isMobile } = useDeviceDetection();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [trainingData, setTrainingData] = useState(mockTrainingData);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);

  // 計算統計數據
  const stats = {
    totalTrainings: trainingData.length,
    avgCenterMove: (trainingData.reduce((sum, d) => sum + d.centerMoveAvg, 0) / trainingData.length).toFixed(1),
    maxCenterMove: Math.max(...trainingData.map(d => d.centerMoveMax)).toFixed(1),
    avgInclination: (trainingData.reduce((sum, d) => sum + d.inclinationAvg, 0) / trainingData.length).toFixed(1),
    avgStability: Math.round(trainingData.reduce((sum, d) => sum + d.stabilityScore, 0) / trainingData.length),
    avgJointDeviation: (trainingData.reduce((sum, d) => sum + d.jointDeviation, 0) / trainingData.length).toFixed(1),
    centerMoveVariance: calculateVariance(trainingData.map(d => d.centerMoveAvg)).toFixed(2)
  };

  function calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  const handleViewTraining = (id) => {
    navigate(`/motion-viewer/${id}`);
  };

  const handleCompareTraining = (id) => {
    if (!compareMode) {
      setCompareMode(true);
      setSelectedRecords([id]);
    } else {
      if (selectedRecords.includes(id)) {
        setSelectedRecords(selectedRecords.filter(recordId => recordId !== id));
      } else if (selectedRecords.length < 3) {
        setSelectedRecords([...selectedRecords, id]);
      }
    }
  };

  const handleCompareAnalysis = () => {
    if (selectedRecords.length >= 2) {
      navigate(`/motion-compare/${selectedRecords.join(',')}`);
    }
  };

  const handleCancelCompare = () => {
    setCompareMode(false);
    setSelectedRecords([]);
  };

  return (
    <div className={`motion-dashboard ${isMobile ? 'mobile' : ''}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>動作分析儀表板</h1>
          <div className="header-controls">
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="period-selector"
            >
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
              <option value="90d">最近 90 天</option>
            </select>
            {compareMode && (
              <div className="compare-controls">
                <button 
                  className="btn-success"
                  onClick={handleCompareAnalysis}
                  disabled={selectedRecords.length < 2}
                >
                  對比分析 ({selectedRecords.length})
                </button>
                <button 
                  className="btn-cancel"
                  onClick={handleCancelCompare}
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="overview-section">
        <h2>訓練概覽</h2>
        <div className="stats-grid">
          <StatCard 
            title="總訓練次數" 
            value={stats.totalTrainings} 
            unit="次" 
            isMobile={isMobile}
          />
          <StatCard 
            title="重心移動平均" 
            value={stats.avgCenterMove} 
            unit="m" 
            trend={-5.2}
            isMobile={isMobile}
          />
          <StatCard 
            title="重心移動最大值" 
            value={stats.maxCenterMove} 
            unit="m" 
            trend={-12.8}
            isMobile={isMobile}
          />
          <StatCard 
            title="重心移動變異" 
            value={stats.centerMoveVariance} 
            unit="" 
            trend={-8.1}
            isMobile={isMobile}
          />
          <StatCard 
            title="傾斜角平均" 
            value={stats.avgInclination} 
            unit="°" 
            trend={-15.3}
            isMobile={isMobile}
          />
          <StatCard 
            title="姿態穩定性" 
            value={stats.avgStability} 
            unit="%" 
            trend={8.2}
            isMobile={isMobile}
          />
          <StatCard 
            title="關節角度偏差" 
            value={stats.avgJointDeviation} 
            unit="°" 
            trend={-17.1}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Trend Charts */}
      <div className="trends-section">
        <h2>趨勢分析</h2>
        <div className="charts-grid">
          <TrendChart 
            data={trainingData}
            metric="centerMoveAvg"
            title="重心移動距離趨勢"
            isMobile={isMobile}
          />
          <TrendChart 
            data={trainingData}
            metric="inclinationAvg"
            title="傾斜角變化趨勢"
            isMobile={isMobile}
          />
          <TrendChart 
            data={trainingData}
            metric="stabilityScore"
            title="姿態穩定性趨勢"
            isMobile={isMobile}
          />
          <TrendChart 
            data={trainingData}
            metric="jointDeviation"
            title="關節角度偏差趨勢"
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Training Records */}
      <div className="records-section">
        <h2>訓練紀錄</h2>
        <div className="records-list">
          {trainingData.map(record => (
            <div 
              key={record.id}
              className={`record-wrapper ${compareMode && selectedRecords.includes(record.id) ? 'selected' : ''}`}
            >
              <TrainingRecord
                record={record}
                onView={handleViewTraining}
                onCompare={handleCompareTraining}
                isMobile={isMobile}
              />
              {compareMode && (
                <div className="compare-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRecords.includes(record.id)}
                    onChange={() => handleCompareTraining(record.id)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MotionDashboard;