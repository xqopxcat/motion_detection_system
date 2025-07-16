# Motion Detection System - Server

這是動作檢測系統的後端 API 服務，基於 Node.js + Express + MongoDB 構建。

## 功能特性

### 核心功能
- 🎥 **影片上傳與存儲**：支援 WebM、MP4 等格式的影片上傳
- 📊 **姿勢數據管理**：存儲和分析 MediaPipe 姿勢關鍵點數據
- 👤 **用戶管理**：註冊、登入、個人資料管理
- 📈 **數據分析**：提供詳細的動作分析和統計功能
- 🔒 **安全性**：JWT 認證、速率限制、數據驗證

### 技術架構
- **後端框架**：Express.js
- **資料庫**：MongoDB + Mongoose ODM
- **檔案存儲**：GridFS（用於大檔案存儲）
- **認證**：JWT + bcrypt
- **驗證**：Joi 數據驗證
- **安全**：Helmet、CORS、速率限制

## 資料庫設計

### 主要 Schema

#### MotionSession（動作會話）
- 存儲完整的動作檢測會話數據
- 包含影片檔案、姿勢關鍵點、分析結果
- 支援標籤、公開/私人設定

#### User（用戶）
- 用戶認證和個人資料
- 角色管理（用戶/管理員/研究者）
- 偏好設定

#### AnalysisTemplate（分析模板）
- 預定義的分析算法和參數
- 支援不同類型的動作識別

## API 端點

### 認證 API (`/api/auth`)
- `POST /register` - 用戶註冊
- `POST /login` - 用戶登入
- `GET /me` - 獲取當前用戶信息
- `PUT /me` - 更新用戶資料
- `POST /change-password` - 修改密碼
- `POST /logout` - 登出

### 會話 API (`/api/sessions`)
- `GET /` - 獲取會話列表（支援分頁、過濾）
- `POST /` - 創建新會話（上傳影片+姿勢數據）
- `GET /:id` - 獲取特定會話詳情
- `PUT /:id` - 更新會話信息
- `DELETE /:id` - 刪除會話
- `GET /:id/frames` - 獲取特定時間範圍的幀數據

### 檔案 API (`/api/files`)
- `GET /:fileId` - 下載檔案
- `GET /:fileId/info` - 獲取檔案信息

### 分析 API (`/api/analytics`)
- `GET /overview` - 獲取總覽統計
- `GET /sessions/trends` - 會話趨勢數據
- `GET /quality/distribution` - 品質分佈
- `GET /landmarks/usage` - 關鍵點使用統計

## 安裝與使用

### 環境要求
- Node.js 16+
- MongoDB 4.4+
- npm 或 yarn

### 安裝步驟

1. **安裝依賴**
```bash
npm install
```

2. **配置環境變數**
```bash
cp .env.example .env
# 編輯 .env 檔案，設置必要的環境變數
```

3. **啟動 MongoDB**
```bash
# 本地 MongoDB
mongod

# 或使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

4. **啟動開發伺服器**
```bash
npm run dev
```

5. **生產環境啟動**
```bash
npm start
```

### 環境變數配置

關鍵環境變數說明：

```env
# 伺服器配置
NODE_ENV=development
PORT=5000

# 資料庫配置
MONGODB_URI=mongodb://localhost:27017/motion_detection_system

# JWT 配置
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# CORS 配置
CLIENT_URL=http://localhost:3000
```

## 資料格式

### 姿勢數據格式
```json
[
  {
    "timestamp": 1752065663717,
    "frameTime": 0.061,
    "frameNumber": 0,
    "landmarks2D": [
      {
        "x": 0.54622483253479,
        "y": 0.328895628452301,
        "z": -0.20458878576755524,
        "visibility": 0.9999923706054688
      }
      // ... 33 個關鍵點
    ],
    "confidenceValues": [0.98, 0.94, ...]
  }
  // ... 更多幀
]
```

### 上傳檔案要求
- **影片格式**：WebM（推薦）、MP4、AVI、MOV
- **數據格式**：JSON
- **最大檔案大小**：100MB
- **同時上傳**：1個影片 + 1個JSON檔案

## 開發指南

### 專案結構
```
server/
├── config/          # 配置檔案
│   ├── database.js   # 資料庫連接
│   └── upload.js     # 檔案上傳配置
├── models/          # 資料模型
│   ├── User.js
│   ├── MotionSession.js
│   └── AnalysisTemplate.js
├── routes/          # 路由
│   ├── auth.js
│   ├── sessions.js
│   ├── files.js
│   └── analytics.js
├── middleware/      # 中間件
│   ├── auth.js
│   ├── validation.js
│   ├── rateLimiter.js
│   └── errorHandler.js
└── server.js        # 主要伺服器檔案
```

### 開發工具
- **nodemon**：自動重啟開發伺服器
- **jest**：單元測試
- **supertest**：API 測試

### 測試
```bash
npm test
```

## 安全性

### 實施的安全措施
- **JWT 認證**：安全的用戶認證
- **密碼加密**：bcrypt 雜湊
- **速率限制**：防止 API 濫用
- **數據驗證**：Joi 輸入驗證
- **CORS 配置**：跨域請求控制
- **Helmet**：HTTP 安全標頭

### 權限控制
- **公開訪問**：查看公開會話
- **用戶訪問**：管理自己的會話
- **管理員訪問**：管理所有資源

## 性能優化

### 資料庫優化
- **索引設置**：重要欄位建立索引
- **分頁查詢**：大數據集分頁處理
- **數據聚合**：MongoDB 聚合管道

### 檔案處理
- **GridFS**：大檔案分塊存儲
- **串流處理**：記憶體效率優化
- **快取控制**：HTTP 快取標頭

## 部署

### Docker 部署
```dockerfile
# Dockerfile 範例
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### 生產環境檢查清單
- [ ] 環境變數設置
- [ ] MongoDB 連接穩定
- [ ] JWT 密鑰安全
- [ ] 檔案上傳限制
- [ ] 速率限制配置
- [ ] 日誌記錄設置
- [ ] 健康檢查端點

## 故障排除

### 常見問題
1. **MongoDB 連接失敗**：檢查 MONGODB_URI 和 MongoDB 服務狀態
2. **檔案上傳失敗**：檢查檔案大小和格式限制
3. **JWT 驗證失敗**：檢查 JWT_SECRET 設置
4. **CORS 錯誤**：檢查 CLIENT_URL 配置

### 除錯
```bash
# 啟用詳細日誌
DEBUG=* npm run dev

# 檢查資料庫連接
mongo mongodb://localhost:27017/motion_detection_system
```

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 授權

MIT License
