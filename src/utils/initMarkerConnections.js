export const initMarkers = (filteredLandmarks, canvas, ctx) => {
    // 繪製過濾後的關鍵點
    ctx.fillStyle = '#00FF00';
    ctx.strokeStyle = '#00CC00';
    ctx.lineWidth = 2;
    
    // 手動繪製關鍵點（圓點）
    filteredLandmarks.forEach((landmark, index) => {
      const x = landmark.x * canvas.width;
      const y = landmark.y * canvas.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // 可選：顯示關鍵點標籤
    //   const originalIndex = allowedIndices[index];
    //   const keypointNames = {
    //     0: 'NOSE', 11: 'L_SHOULDER', 12: 'R_SHOULDER',
    //     13: 'L_ELBOW', 14: 'R_ELBOW', 15: 'L_WRIST', 16: 'R_WRIST',
    //     23: 'L_HIP', 24: 'R_HIP', 25: 'L_KNEE', 26: 'R_KNEE',
    //     27: 'L_ANKLE', 28: 'R_ANKLE', 31: 'L_FOOT', 32: 'R_FOOT'
    //   };
      
    //   const name = keypointNames[originalIndex];
    //   if (name) {
    //     ctx.fillStyle = '#FFFFFF';
    //     ctx.font = '10px Arial';
    //     ctx.fillText(name, x + 8, y - 8);
    //     ctx.fillStyle = '#00FF00';
    //   }
    });   
}

export const initrConnections = (filteredLandmarks, filteredConnections, canvas, ctx) => {
    // 繪製過濾後的連線
    ctx.strokeStyle = '#00CC00';
    ctx.lineWidth = 2;
    
    // 繪製過濾後的連線
    filteredConnections.forEach(([startIdx, endIdx]) => {
      const startPoint = filteredLandmarks[startIdx];
      const endPoint = filteredLandmarks[endIdx];
      
      if (startPoint && endPoint) {
        const startX = startPoint.x * canvas.width;
        const startY = startPoint.y * canvas.height;
        const endX = endPoint.x * canvas.width;
        const endY = endPoint.y * canvas.height;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
}