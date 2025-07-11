import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Navigation from './components/Navigation'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import MotionDetection from './pages/MotionDetection'
import MotionViewer from './pages/MotionViewer'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MotionDetection />} />
          <Route path="/about" element={<MotionViewer />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
