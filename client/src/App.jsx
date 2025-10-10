import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Register from './pages/Register';
import MotionDetection from './pages/MotionDetection';
import MotionDashboard from './pages/MotionDashboard';
import MotionViewer from './pages/MotionViewer'
import MotionList from "./pages/MotionList"
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* 公開路由 - 不需要登入 */}
            <Route 
              path="/login" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <Login />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <Register />
                </ProtectedRoute>
              } 
            />

            {/* 主要應用路由 - 支援訪客模式 */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <div style={{ display: 'flex' }}>
                    <Navigation />
                    <div style={{ flex: 1 }}>
                      <MotionDashboard />
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/detection" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <div style={{ display: 'flex' }}>
                    <Navigation />
                    <div style={{ flex: 1 }}>
                      <MotionDetection />
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/motion" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <div style={{ display: 'flex' }}>
                    <Navigation />
                    <div style={{ flex: 1 }}>
                      <MotionList />
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/motion/:id" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <div style={{ display: 'flex' }}>
                    <Navigation />
                    <div style={{ flex: 1 }}>
                      <MotionViewer />
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" replace />}
            />

            {/* 404 重定向 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;