const express = require('express');
const router = express.Router();

// API 路由
router.use('/motions', require('./motions'));
router.use('/annotations', require('./annotations'));
// router.use('/auth', require('./auth'));
// router.use('/sessions', require('./sessions'));
// router.use('/files', require('./files'));
// router.use('/analytics', require('./analytics'));


// API 狀態檢查
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Motion Detection API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API 根路徑
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Motion Detection System API',
        version: '1.0.0',
        endpoints: {
            motions: '/api/motions',
            annotations: '/api/annotations',
        //   auth: '/api/auth',
        //   sessions: '/api/sessions',
        //   files: '/api/files',
        //   analytics: '/api/analytics',
            health: '/api/health'
        }
    });
});

module.exports = router;
