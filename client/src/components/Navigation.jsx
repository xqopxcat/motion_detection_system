import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

function Navigation() {
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(false)

  const sidebarStyle = {
    position: 'fixed',
    left: '0',
    top: '0',
    height: '100vh',
    width: isExpanded ? '200px' : '40px',
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
    position: 'absolute',
    top: '20px',
    right: '-15px',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: 'rgba(0, 255, 255, 0.2)',
    border: '2px solid rgba(0, 255, 255, 0.5)',
    color: '#00ffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    zIndex: 1001
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
    padding: '12px 5px',
    color: '#00ffff',
    transition: 'all 0.3s ease',
    margin: '0 0 0 0',
    fontSize: '14px',
    fontWeight: '500',
    position: 'relative',
    overflow: 'hidden'
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
      case '/':
        return '🎯'
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
            e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.3)'
            e.target.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.2)'
            e.target.style.transform = 'scale(1)'
          }}
        >
          {isExpanded ? '◀' : '▶'}
        </button>

        <ul style={navListStyle}>
          <li>
            <Link
              to="/"
              style={location.pathname === '/' ? activeLinkStyle : linkStyle}
              
            >
              <span style={iconStyle}>{getIcon('/')}</span>
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
      </nav>
    </>
  )
}

export default Navigation
