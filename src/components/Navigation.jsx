import { Link, useLocation } from 'react-router-dom'

function Navigation() {
  const location = useLocation()

  const navStyle = {
    display: 'flex',
    gap: '2rem',
    padding: '1rem 0',
    marginBottom: '2rem',
    borderBottom: '1px solid #333'
  }

  const linkStyle = {
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    transition: 'background-color 0.3s'
  }

  const activeLinkStyle = {
    ...linkStyle,
    backgroundColor: '#646cff',
    color: 'white'
  }

  return (
    <nav style={navStyle}>
      <Link 
        to="/" 
        style={location.pathname === '/' ? activeLinkStyle : linkStyle}
      >
        首頁
      </Link>
      <Link 
        to="/about" 
        style={location.pathname === '/about' ? activeLinkStyle : linkStyle}
      >
        關於我們
      </Link>
      <Link 
        to="/contact" 
        style={location.pathname === '/contact' ? activeLinkStyle : linkStyle}
      >
        聯絡我們
      </Link>
    </nav>
  )
}

export default Navigation
