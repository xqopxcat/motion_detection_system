// client/src/pages/MotionDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { getAuthHeaders } from '../utils/auth';
import './MotionDashboard.scss';

const StatCard = ({ title, value, unit, trend, isMobile, loading }) => (
  <div className={`stat-card ${isMobile ? 'mobile' : ''} ${loading ? 'loading' : ''}`}>
    <div className="stat-header">
      <h3>{title}</h3>
      {trend !== undefined && !loading && (
        <span className={`trend ${trend > 0 ? 'up' : 'down'}`}>
          {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="stat-value">
      {loading ? (
        <div className="loading-spinner">⟳</div>
      ) : (
        <>
          {value} <span className="unit">{unit}</span>
        </>
      )}
    </div>
  </div>
);

const TrendChart = ({ data, metric, title, unit = '', isMobile }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`trend-chart ${isMobile ? 'mobile' : ''}`} style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        padding: '20px',
        minHeight: '300px'
      }}>
        <h3 style={{
          color: '#00ffff',
          fontSize: isMobile ? '16px' : '18px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {title}
        </h3>
        <div className="no-data" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: '#aaaaaa',
          fontSize: '16px',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
          暫無數據
        </div>
      </div>
    );
  }

  // 準備圖表數據
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('zh-TW', { 
      month: 'short', 
      day: 'numeric' 
    }),
    value: d[metric],
    fullDate: new Date(d.date).toLocaleDateString('zh-TW'),
    name: d.name
  }));

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(0, 255, 255, 0.5)',
          borderRadius: '6px',
          padding: '10px',
          color: '#e0e0e0'
        }}>
          <p style={{ margin: '0 0 5px 0', color: '#00ffff' }}>
            {data.fullDate}
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#cccccc' }}>
            {data.name}
          </p>
          <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>
            {`${payload[0].value}${unit}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`trend-chart ${isMobile ? 'mobile' : ''}`} style={{
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '12px',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      padding: '20px',
      minHeight: '300px'
    }}>
      <h3 style={{
        color: '#00ffff',
        fontSize: isMobile ? '16px' : '18px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        {title}
      </h3>
      
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00ffff" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00ffff" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(0, 255, 255, 0.2)" 
          />
          <XAxis 
            dataKey="date"
            stroke="#aaaaaa"
            fontSize={12}
            tick={{ fill: '#aaaaaa' }}
          />
          <YAxis
            stroke="#aaaaaa"
            fontSize={12}
            tick={{ fill: '#aaaaaa' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#00ffff"
            strokeWidth={2}
            fill="url(#colorGradient)"
            dot={{ fill: '#00ffff', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#00ffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const TrainingRecord = ({ record, onView, isMobile }) => (
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
          style={{
            padding: isMobile ? '8px 12px' : '10px 16px',
            background: 'linear-gradient(145deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 255, 0.3))',
            border: '1px solid rgba(0, 255, 255, 0.5)',
            borderRadius: '6px',
            color: '#00ffff',
            cursor: 'pointer',
            fontSize: isMobile ? '12px' : '14px',
            transition: 'all 0.3s ease'
          }}
        >
          {isMobile ? '檢視' : '詳細檢視'}
        </button>
      </div>
    </div>
    
    {/* 其他內容保持不變 */}
    <div className="record-metrics">
      <div className="metric">
        <span className="label">重心移動</span>
        <span className="value">{record.centerMoveAvg}cm</span>
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
        <span className="label">狀態</span>
        <span className={`value status-${record.status}`}>
          {record.status === 'completed' ? '✅ 完成' : 
           record.status === 'processing' ? '⏳ 處理中' : 
           '❌ 失敗'}
        </span>
      </div>
    </div>
    
    <div className="record-footer">
      <span className="duration">
        時長: {Math.floor(record.duration / 60)}:{(record.duration % 60).toString().padStart(2, '0')}
      </span>
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
  const { user } = useAuth();
  const { isMobile } = useDeviceDetection();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // const [compareMode, setCompareMode] = useState(false);
  // const [selectedRecords, setSelectedRecords] = useState([]);
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  // 監聽導航欄狀態變化
  useEffect(() => {
    const handleNavToggle = (event) => {
      setIsNavExpanded(event.detail.isExpanded);
    };

    window.addEventListener('navToggle', handleNavToggle);
    return () => window.removeEventListener('navToggle', handleNavToggle);
  }, []);

  // 獲取儀表板數據
  const fetchDashboardData = async (period = selectedPeriod) => {
    try {
      setLoading(true);
      setError('');

      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/dashboard/stats?period=${period}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
        console.log('📊 Dashboard 數據載入成功:', result.data);
      } else {
        throw new Error(result.message || '獲取數據失敗');
      }
    } catch (error) {
      console.error('❌ 獲取 Dashboard 數據失敗:', error);
      setError('載入數據失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  // 初始載入和期間變更時重新獲取數據
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedPeriod]);

  // 計算動態邊距
  const getMarginLeft = () => {
    if (isMobile) return '0px';
    return isNavExpanded ? '200px' : '40px';
  };

  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
  };

  const handleViewTraining = (id) => {
    navigate(`/motion/${id}`);
  };

  // const handleCompareTraining = (id) => {
  //   if (!compareMode) {
  //     setCompareMode(true);
  //     setSelectedRecords([id]);
  //   } else {
  //     if (selectedRecords.includes(id)) {
  //       setSelectedRecords(selectedRecords.filter(recordId => recordId !== id));
  //     } else if (selectedRecords.length < 3) {
  //       setSelectedRecords([...selectedRecords, id]);
  //     }
  //   }
  // };

  // const handleCompareAnalysis = () => {
  //   if (selectedRecords.length >= 2) {
  //     navigate(`/motion-compare/${selectedRecords.join(',')}`);
  //   }
  // };

  // const handleCancelCompare = () => {
  //   setCompareMode(false);
  //   setSelectedRecords([]);
  // };

  // 如果載入中且沒有數據，顯示載入畫面
  if (loading && !dashboardData) {
    return (
      <div style={{
        marginLeft: getMarginLeft(),
        minHeight: '100vh',
        background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.9) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00ffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏃‍♂️</div>
          <div style={{ fontSize: '18px' }}>載入儀表板數據中...</div>
        </div>
      </div>
    );
  }

  // 如果有錯誤，顯示錯誤訊息
  if (error && !dashboardData) {
    return (
      <div style={{
        marginLeft: getMarginLeft(),
        minHeight: '100vh',
        background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.9) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ff6b6b'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>{error}</div>
          <button 
            onClick={() => fetchDashboardData()}
            style={{
              padding: '10px 20px',
              background: 'rgba(0, 255, 255, 0.2)',
              border: '1px solid rgba(0, 255, 255, 0.5)',
              borderRadius: '6px',
              color: '#00ffff',
              cursor: 'pointer'
            }}
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  // 準備統計數據
  const stats = dashboardData ? {
    totalTrainings: dashboardData.periodMotions || 0,
    avgCenterMove: dashboardData.avgCenterMove || 0,
    maxCenterMove: dashboardData.maxCenterMove || 0,
    avgInclination: dashboardData.avgInclination || 0,
    avgStability: dashboardData.avgStability || 0,
    avgJointDeviation: dashboardData.avgJointDeviation || 0,
    centerMoveVariance: dashboardData.centerMoveVariance || 0
  } : {};

  const trainingData = dashboardData?.trendsData || [];
  const recentMotions = dashboardData?.recentMotions || [];

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
            margin: '0 0 5px 0'
          }}>
            歡迎回來，{user?.username || '用戶'}！分析您的運動表現與進步軌跡
          </p>
          {dashboardData && (
            <p style={{
              color: '#aaaaaa',
              fontSize: isMobile ? '12px' : '14px',
              margin: '0'
            }}>
              期間：{selectedPeriod === '7d' ? '最近 7 天' : 
                     selectedPeriod === '30d' ? '最近 30 天' : '最近 90 天'} | 
              總記錄：{dashboardData.totalMotions} 筆 | 
              期間記錄：{dashboardData.periodMotions} 筆
            </p>
          )}
          
          <div className="header-controls" style={{
            display: 'flex',
            gap: '15px',
            marginTop: '15px',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center'
          }}>
            <select 
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
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
            title="期間訓練次數" 
            value={stats.totalTrainings} 
            unit="次" 
            isMobile={isMobile}
            loading={loading}
          />
          <StatCard 
            title="重心移動平均" 
            value={stats.avgCenterMove} 
            unit="cm" 
            isMobile={isMobile}
            loading={loading}
          />
          <StatCard 
            title="重心移動最大值" 
            value={stats.maxCenterMove} 
            unit="cm" 
            isMobile={isMobile}
            loading={loading}
          />
          <StatCard 
            title="重心移動變異" 
            value={stats.centerMoveVariance} 
            unit="" 
            isMobile={isMobile}
            loading={loading}
          />
          <StatCard 
            title="傾斜角平均" 
            value={stats.avgInclination} 
            unit="°" 
            isMobile={isMobile}
            loading={loading}
          />
          <StatCard 
            title="姿態穩定性" 
            value={stats.avgStability} 
            unit="%" 
            isMobile={isMobile}
            loading={loading}
          />
          <StatCard 
            title="關節角度偏差" 
            value={stats.avgJointDeviation} 
            unit="°" 
            isMobile={isMobile}
            loading={loading}
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
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: isMobile ? '15px' : '25px'
        }}>
          <TrendChart 
            data={trainingData}
            metric="centerMoveAvg"
            title="重心移動距離趨勢"
            unit="cm"
            isMobile={isMobile}
          />
          <TrendChart 
            data={trainingData}
            metric="inclinationAvg"
            title="傾斜角變化趨勢"
            unit="°"
            isMobile={isMobile}
          />
          <TrendChart 
            data={trainingData}
            metric="stabilityScore"
            title="姿態穩定性趨勢"
            unit="%"
            isMobile={isMobile}
          />
          <TrendChart 
            data={trainingData}
            metric="jointDeviation"
            title="關節角度偏差趨勢"
            unit="°"
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Training Records */}
      <div className="records-section">
        <h2>🎯 最近訓練紀錄</h2>
        
        {recentMotions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#aaaaaa',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
            <h3 style={{ margin: '0 0 10px 0' }}>暫無訓練記錄</h3>
            <p style={{ margin: '0 0 20px 0' }}>開始您的第一次運動分析吧！</p>
            <button
              onClick={() => navigate('/detection')}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(145deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 255, 0.3))',
                border: '1px solid rgba(0, 255, 255, 0.5)',
                borderRadius: '8px',
                color: '#00ffff',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
            >
              開始動作檢測
            </button>
          </div>
        ) : (
          <div className="records-list" style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: isMobile ? '10px' : '15px'
          }}>
            {recentMotions.map(record => (
              <TrainingRecord
                key={record.id}
                record={record}
                onView={handleViewTraining}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MotionDashboard;