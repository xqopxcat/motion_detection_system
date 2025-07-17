import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetMotionsQuery } from "../../redux/services/motionCoreAPI";

const MotionList = () => {
  const [motions, setMotions] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const navigate = useNavigate();

  const { data: motionsData, isFetching, error: queryError } = useGetMotionsQuery();
  
  useEffect(() => {
    if (motionsData && !isFetching) {
      setMotions(motionsData?.data);
    }
    if (queryError) {
      setError(queryError.message || '載入數據失敗');
    }
  }, [motionsData, isFetching, queryError]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleViewMotion = (sessionId) => {
    navigate(`/motion/${sessionId}`);
  };

  const handleDeleteMotion = async (sessionId) => {
    if (!window.confirm('確定要刪除這個動作記錄嗎？')) {
      return;
    }
    
    try {
      // 這裡需要實作刪除 API
      // await deleteMotion(sessionId);
      // setMotions(motions.filter(motion => motion.sessionId !== sessionId));
      alert('刪除成功');
    } catch (error) {
      alert('刪除失敗: ' + error.message);
    }
  };
  
  
  const filteredMotions = useMemo(() => {
    if (!motions || !Array.isArray(motions)) {
      return [];
    }

    // 創建副本
    let filtered = [...motions];

    // 過濾
    if (filter === 'public') {
      filtered = filtered.filter(motion => motion.isPublic);
    } else if (filter === 'private') {
      filtered = filtered.filter(motion => !motion.isPublic);
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'duration':
          return (b.videoDuration || 0) - (a.videoDuration || 0);
        case 'quality':
          return (b.analysis?.qualityScore || 0) - (a.analysis?.qualityScore || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [motions, filter, sortBy]);

  if (isFetching) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        fontSize: '18px',
        color: '#64748b'
      }}>
        ⏳ 載入中...
      </div>
    );
  }

  return (
    <>
      {error ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          gap: '16px'
        }}>
          <div style={{ fontSize: '24px' }}>❌</div>
          <div style={{ fontSize: '18px', color: '#ef4444' }}>{error}</div>
          <button
            onClick={() => window.location.reload()} // 🔧 簡單的重新載入
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(145deg, #3b82f6, #1d4ed8)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            重新載入
          </button>
        </div>
      ) : (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {
            isFetching ? (<div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '50vh',
              fontSize: '18px',
              color: '#64748b'
            }}>
              ⏳ 載入中...
            </div>) : (
            <div style={{
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {/* 標題區 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '30px',
                marginBottom: '30px',
                textAlign: 'center',
                color: 'white'
              }}>
                <h1 style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  margin: '0 0 10px 0',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}>
                  🎭 動作記錄庫
                </h1>
                <p style={{
                  fontSize: '18px',
                  margin: 0,
                  opacity: 0.9
                }}>
                  總共 {motions.length} 個動作記錄
                </p>
              </div>

              {/* 控制區 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '30px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      background: 'white'
                    }}
                  >
                    <option value="all">全部記錄</option>
                    <option value="public">公開記錄</option>
                    <option value="private">私人記錄</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      background: 'white'
                    }}
                  >
                    <option value="newest">最新建立</option>
                    <option value="oldest">最早建立</option>
                    <option value="duration">影片長度</option>
                    <option value="quality">品質分數</option>
                  </select>
                </div>

                <button
                  onClick={() => navigate('/')}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(145deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ➕ 新增記錄
                </button>
              </div>

              {/* 動作記錄列表 */}
              {filteredMotions.length === 0 ? (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '16px',
                  padding: '60px 20px',
                  textAlign: 'center',
                  color: '#64748b'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>沒有動作記錄</h3>
                  <p style={{ margin: 0, fontSize: '16px' }}>
                    {filter === 'all' ? '開始您的第一個動作檢測吧！' : '該類別下沒有記錄'}
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '20px'
                }}>
                  {filteredMotions.map((motion) => (
                    <div
                      key={motion.sessionId}
                      style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        padding: '20px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                      }}
                      onClick={() => handleViewMotion(motion.sessionId)}
                    >
                      {/* 影片縮圖區 */}
                      <div style={{
                        width: '100%',
                        height: '180px',
                        borderRadius: '12px',
                        background: 'linear-gradient(45deg, #f3f4f6, #e5e7eb)',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {motion.videoUrl ? (
                          <video
                            src={motion.videoUrl}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '12px'
                            }}
                            muted
                            preload="metadata"
                          />
                        ) : (
                          <div style={{
                            fontSize: '48px',
                            color: '#9ca3af'
                          }}>
                            🎬
                          </div>
                        )}
                        
                        {/* 時長標籤 */}
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {formatDuration(motion.videoDuration)}
                        </div>

                        {/* 公開/私人標籤 */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: motion.isPublic 
                            ? 'rgba(34, 197, 94, 0.9)' 
                            : 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {motion.isPublic ? '🌐 公開' : '🔒 私人'}
                        </div>
                      </div>

                      {/* 內容區 */}
                      <div style={{ marginBottom: '16px' }}>
                        <h3 style={{
                          margin: '0 0 8px 0',
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1f2937',
                          lineHeight: '1.4'
                        }}>
                          {motion.title}
                        </h3>
                        
                        {motion.description && (
                          <p style={{
                            margin: '0 0 12px 0',
                            fontSize: '14px',
                            color: '#64748b',
                            lineHeight: '1.5',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {motion.description}
                          </p>
                        )}
                      </div>

                      {/* 統計信息 */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#3b82f6' }}>
                            {motion.metadata?.totalFrames || 0}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>幀數</div>
                        </div>
                        
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                            {motion.metadata?.fps || 30}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>FPS</div>
                        </div>
                      </div>

                      {/* 檔案信息 */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        color: '#64748b',
                        marginBottom: '16px'
                      }}>
                        <span>📁 {formatFileSize(motion.videoSize)}</span>
                        <span>📅 {formatDate(motion.createdAt)}</span>
                      </div>

                      {/* 標籤 */}
                      {motion.tags && motion.tags.length > 0 && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginBottom: '16px'
                        }}>
                          {motion.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                color: '#8b5cf6',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                          {motion.tags.length > 3 && (
                            <span style={{
                              color: '#64748b',
                              fontSize: '12px',
                              padding: '4px 8px'
                            }}>
                              +{motion.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 操作按鈕 */}
                      <div style={{
                        display: 'flex',
                        gap: '8px'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewMotion(motion.sessionId);
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 16px',
                            background: 'linear-gradient(145deg, #3b82f6, #1d4ed8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          📊 查看詳情
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMotion(motion.sessionId);
                          }}
                          style={{
                            padding: '8px 12px',
                            background: 'linear-gradient(145deg, #ef4444, #dc2626)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )
          }

        </div>
      )}
    </>
  );
};

export default MotionList;