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
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  // 監聽導航欄狀態變化
  useEffect(() => {
    const handleNavToggle = (event) => {
      setIsNavExpanded(event.detail.isExpanded);
    };

    window.addEventListener('navToggle', handleNavToggle);
    return () => window.removeEventListener('navToggle', handleNavToggle);
  }, []);

  // 計算動態邊距
  const getMarginLeft = () => {
    if (isMobile) return '0px';
    return isNavExpanded ? '200px' : '40px';
  };

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
    <div 
      className={`motion-dashboard ${isMobile ? 'mobile' : ''}`}
      style={{
        marginLeft: getMarginLeft(),
        transition: 'margin-left 0.3s ease',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.9) 100%)',
        color: '#e0e0e0',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        padding: isMobile ? '10px' : '20px',
        boxSizing: 'border-box'
      }}
    >
      {/* Header */}
      <div className="dashboard-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '30px',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '20px'
      }}>
        <div className="header-content">
          <h1 style={{
            fontSize: isMobile ? '24px' : '32px',
            color: '#00ffff',
            textShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
            margin: '0 0 8px 0',
            letterSpacing: '1px'
          }}>
            🏃‍♂️ Motion Dashboard
          </h1>
          <p style={{
            color: '#cccccc',
            fontSize: isMobile ? '14px' : '16px',
            margin: '0'
          }}>
            分析您的運動表現與進步軌跡
          </p>
          <div className="header-controls" style={{
            display: 'flex',
            gap: '15px',
            marginTop: '15px',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center'
          }}>
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="period-selector"
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '6px',
                color: '#e0e0e0',
                padding: isMobile ? '8px 12px' : '10px 16px',
                fontSize: isMobile ? '12px' : '14px',
                outline: 'none'
              }}
            >
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
              <option value="90d">最近 90 天</option>
            </select>
            {compareMode && (
              <div className="compare-controls" style={{
                display: 'flex',
                gap: '10px'
              }}>
                <button 
                  className="btn-success"
                  onClick={handleCompareAnalysis}
                  disabled={selectedRecords.length < 2}
                  style={{
                    padding: isMobile ? '8px 12px' : '10px 16px',
                    background: selectedRecords.length >= 2 
                      ? 'linear-gradient(145deg, rgba(0, 255, 0, 0.2), rgba(0, 255, 0, 0.3))'
                      : 'rgba(128, 128, 128, 0.3)',
                    border: `1px solid ${selectedRecords.length >= 2 ? 'rgba(0, 255, 0, 0.5)' : 'rgba(128, 128, 128, 0.5)'}`,
                    borderRadius: '6px',
                    color: selectedRecords.length >= 2 ? '#00ff00' : '#888888',
                    cursor: selectedRecords.length >= 2 ? 'pointer' : 'not-allowed',
                    fontSize: isMobile ? '12px' : '14px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  對比分析 ({selectedRecords.length})
                </button>
                <button 
                  className="btn-cancel"
                  onClick={handleCancelCompare}
                  style={{
                    padding: isMobile ? '8px 12px' : '10px 16px',
                    background: 'linear-gradient(145deg, rgba(255, 0, 0, 0.2), rgba(255, 0, 0, 0.3))',
                    border: '1px solid rgba(255, 0, 0, 0.5)',
                    borderRadius: '6px',
                    color: '#ff4444',
                    cursor: 'pointer',
                    fontSize: isMobile ? '12px' : '14px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="overview-section" style={{ marginBottom: '40px' }}>
        <h2 style={{
          fontSize: isMobile ? '18px' : '24px',
          color: '#00ffff',
          textShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
          marginBottom: '20px',
          borderBottom: '2px solid rgba(0, 255, 255, 0.3)',
          paddingBottom: '8px'
        }}>
          📈 訓練概覽
        </h2>
        <div className="stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: isMobile ? '12px' : '20px'
        }}>
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
      <div className="trends-section" style={{ marginBottom: '40px' }}>
        <h2 style={{
          fontSize: isMobile ? '18px' : '24px',
          color: '#00ffff',
          textShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
          marginBottom: '20px',
          borderBottom: '2px solid rgba(0, 255, 255, 0.3)',
          paddingBottom: '8px'
        }}>
          📊 趨勢分析
        </h2>
        <div className="charts-grid" style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: isMobile ? '15px' : '25px'
        }}>
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
        <h2 style={{
          fontSize: isMobile ? '18px' : '24px',
          color: '#00ffff',
          textShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
          marginBottom: '20px',
          borderBottom: '2px solid rgba(0, 255, 255, 0.3)',
          paddingBottom: '8px'
        }}>
          🎯 訓練紀錄
        </h2>
        <div className="records-list" style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: isMobile ? '10px' : '15px'
        }}>
          {trainingData.map(record => (
            <div 
              key={record.id}
              className={`record-wrapper ${compareMode && selectedRecords.includes(record.id) ? 'selected' : ''}`}
              style={{
                position: 'relative',
                background: compareMode && selectedRecords.includes(record.id) 
                  ? 'rgba(0, 255, 255, 0.1)' 
                  : 'transparent',
                borderRadius: '8px',
                border: compareMode && selectedRecords.includes(record.id) 
                  ? '2px solid rgba(0, 255, 255, 0.5)' 
                  : 'none',
                padding: compareMode && selectedRecords.includes(record.id) ? '4px' : '0'
              }}
            >
              <TrainingRecord
                record={record}
                onView={handleViewTraining}
                onCompare={handleCompareTraining}
                isMobile={isMobile}
              />
              {compareMode && (
                <div className="compare-checkbox" style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  zIndex: 10
                }}>
                  <input
                    type="checkbox"
                    checked={selectedRecords.includes(record.id)}
                    onChange={() => handleCompareTraining(record.id)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#00ffff'
                    }}
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