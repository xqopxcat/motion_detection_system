import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Navigation from './components/Navigation'
import MotionDetection from './pages/MotionDetection'
import MotionViewer from './pages/MotionViewer'

function App() {
  return (
    <Router>
      <div className="App" style={{ position: 'relative' }}>
        {/* <Navigation /> */}
          <Routes>
            <Route path="/" element={<MotionDetection />} />
            <Route path="/view" element={<MotionViewer />} />
          </Routes>
      </div>
    </Router>
  )
}

export default App
