export const allowedIndices = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

// 為過濾後的關鍵點定義正確的連線關係
export const createFilteredConnections = (allowedIndices) => {
  // 原始 MediaPipe 連線關係（部分重要的連線）
  const originalConnections = [
    // 上半身主要連線
    [11, 12], // 左肩 - 右肩
    [11, 13], // 左肩 - 左肘
    [13, 15], // 左肘 - 左手腕
    [12, 14], // 右肩 - 右肘
    [14, 16], // 右肘 - 右手腕
    
    // 軀幹連線
    [11, 23], // 左肩 - 左臀
    [12, 24], // 右肩 - 右臀
    [23, 24], // 左臀 - 右臀
    
    // 下半身連線
    [23, 25], // 左臀 - 左膝
    [25, 27], // 左膝 - 左踝
    [24, 26], // 右臀 - 右膝
    [26, 28], // 右膝 - 右踝
    
    // 足部連線
    [27, 31], // 左踝 - 左腳趾
    [27, 29], // 左踝 - 左腳跟
    [29, 31], // 左腳跟 - 左腳趾
    [28, 32], // 右踝 - 右腳趾
    [28, 30], // 右踝 - 右腳跟
    [30, 32], // 右腳跟 - 右腳趾
  ];

  // 創建原始索引到過濾後索引的映射
  const indexMap = {};
  allowedIndices.forEach((originalIndex, newIndex) => {
    indexMap[originalIndex] = newIndex;
  });

  // 過濾並轉換連線關係
  const filteredConnections = [];
  originalConnections.forEach(([start, end]) => {
    // 只有當兩個關鍵點都在允許列表中時才添加連線
    if (allowedIndices.includes(start) && allowedIndices.includes(end)) {
      filteredConnections.push([indexMap[start], indexMap[end]]);
    }
  });

  return filteredConnections;
};