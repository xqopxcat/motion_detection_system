import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useDeviceDetection } from "../hooks/useDeviceDetection";
import { useAuth } from '../contexts/AuthContext'; // 新增

function Navigation() {
  const location = useLocation()
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false)
  
  const { isMobile } = useDeviceDetection();
  const { user, logout } = useAuth(); // 新增
  
  // 發送導航欄狀態變化事件給其他組件
  useEffect(() => {
    const event = new CustomEvent('navToggle', {
      detail: { isExpanded }
    });
    window.dispatchEvent(event);
  }, [isExpanded]);
  
    const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarStyle = {
    position: 'fixed',
    left: '0',
    top: '0',
    height: '100vh',
    width: isExpanded ? '200px' : isMobile ? '0px' : '40px',
    background: 'linear-gradient(180deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.95) 100%)',
    borderRight: '2px solid rgba(0, 255, 255, 0.3)',
    backdropFilter: 'blur(15px)',
    zIndex: 1000,
    transition: 'width 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '20px',
    boxShadow: '4px 0 20px rgba(0, 0, 0, 0.5)'
  }

  const toggleButtonStyle = {
    position: isMobile ? 'fixed' : 'absolute',
    top: '20px',
    left: isMobile ? (isExpanded ? '210px' : '10px') : 'auto', // 行動裝置使用 left
    right: isMobile ? 'auto' : '-15px', // 桌面版使用 right
    width: isMobile ? '50px' : '30px', // 行動裝置更大的按鈕
    height: isMobile ? '50px' : '30px',
    borderRadius: '50%',
    background: 'rgba(0, 255, 255, 0.2)',
    border: '2px solid rgba(0, 255, 255, 0.5)',
    color: '#00ffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isMobile ? '20px' : '16px',
    transition: 'all 0.3s ease',
    zIndex: 1101, // 確保在最上層
    // 行動裝置觸控優化
    ...(isMobile && {
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent'
    })
  }

  const navListStyle = {
    listStyle: 'none',
    padding: '0',
    margin: '60px 0 0 0',
    display: 'flex',
    flexDirection: 'column',
  }

  const linkStyle = {
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    padding: isExpanded ? '12px' : isMobile ? '12px 0px' : '12px',
    color: '#00ffff',
    transition: 'all 0.3s ease',
    margin: '0 0 0 0',
    fontSize: '14px',
    fontWeight: '500',
    position: 'relative',
    overflow: 'hidden',
    // 行動裝置觸控優化
    ...(isMobile && {
      minHeight: '48px',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent'
    })
  }

  const iconStyle = {
    fontSize: '20px',
    minWidth: '20px',
    textAlign: 'center'
  }

  const textStyle = {
    marginLeft: '15px',
    opacity: isExpanded ? 1 : 0,
    transform: isExpanded ? 'translateX(0)' : 'translateX(-10px)',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap'
  }

  const activeLinkStyle = {
    ...linkStyle,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    color: '#ffffff',
  }

  const getIcon = (path) => {
    switch (path) {
      case '/detection':
        return '🎯'
      case '/dashboard':
        return '📊'
      case '/motion':
        return '👁️'
      default:
        return '📱'
    }
  }

  return (
    <>
      <nav style={sidebarStyle}>
        <button
          style={toggleButtonStyle}
          onClick={() => setIsExpanded(!isExpanded)}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.3)'
              e.target.style.transform = 'scale(1.1)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.2)'
              e.target.style.transform = 'scale(1)'
            }
          }}
          onTouchStart={(e) => {
            if (isMobile) {
              e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.3)'
              e.target.style.transform = 'scale(0.95)'
            }
          }}
          onTouchEnd={(e) => {
            if (isMobile) {
              e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.2)'
              e.target.style.transform = 'scale(1)'
            }
          }}
        >
          {isExpanded ? '◀' : '▶'}
        </button>

        <ul style={navListStyle}>
          <li>
            <Link
              to="/dashboard"
              style={location.pathname === '/dashboard' ? activeLinkStyle : linkStyle}
            >
              <span style={iconStyle}>{getIcon('/dashboard')}</span>
              <span style={textStyle}>Motion Dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              to="/detection"
              style={location.pathname === '/detection' ? activeLinkStyle : linkStyle}
            >
              <span style={iconStyle}>{getIcon('/detection')}</span>
              <span style={textStyle}>Motion Detection</span>
            </Link>
          </li>
          <li>
            <Link
              to="/motion"
              style={location.pathname === '/motion' ? activeLinkStyle : linkStyle}
            >
              <span style={iconStyle}>{getIcon('/motion')}</span>
              <span style={textStyle}>Motion Viewer</span>
            </Link>
          </li>
        </ul>
          {user && (
            <div style={{
              margin: 'auto 0',
              padding: '15px',
              borderTop: '1px solid rgba(0, 255, 255, 0.2)',
              display: isExpanded ? 'block' : 'none'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#cccccc',
                marginBottom: '8px',
                textAlign: 'center',
                wordBreak: 'break-word'
              }}>
                {user.profile?.firstName || user.username || user.email}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(255, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 0, 0, 0.3)',
                  borderRadius: '6px',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 0, 0, 0.2)';
                }}
              >
                登出
              </button>
            </div>
        )}

        {/* 訪客模式提示 */}
        {!user && (
          <div style={{
            margin: 'auto 0',
            padding: '15px',
            borderTop: '1px solid rgba(0, 255, 255, 0.2)',
            display: isExpanded ? 'block' : 'none'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#888',
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              訪客模式
            </div>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'rgba(0, 255, 255, 0.1)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '4px',
                color: '#00ffff',
                cursor: 'pointer',
                fontSize: '10px',
                transition: 'all 0.3s ease'
              }}
            >
              登入帳戶
            </button>
          </div>
        )}
      </nav>
    </>
  )
}

export default Navigation