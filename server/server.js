require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const connectDB = require('./mongodb/connect.js');

const app = express();

// 基本中間件
app.use(cors());

// 安全中間件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 壓縮響應
app.use(compression());

// 請求日誌
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 靜態檔案服務
app.use(express.static('public'));

// API 路由
app.use('/api', require('./routes'));

// 根路徑
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Motion Detection System Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 啟動伺服器
const PORT = process.env.PORT || 8080;
const startServer = async () => {
    try {
        await connectDB(process.env.MONGODB_URL);
        app.listen(PORT, () => {
            console.log(`🚀 Motion Detection Server is running!`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Server: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
};

startServer();