export const exportJSON = (motionDataRef) => {
    if (!motionDataRef.current || motionDataRef.current.length === 0) return;
    const jsonStr = JSON.stringify(motionDataRef.current, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pose_landmarks_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    console.log('JSON 匯出完成');
};

export const exportBVH = async (motionDataRef) => {
    if (!bvhExporterRef.current || motionDataRef.current.length === 0) return;
    
    try {
    // 轉換數據格式為 BVH 導出器期望的格式
    const formattedData = motionDataRef.current.map(frame => ({
        timestamp: frame.timestamp,
        frameTime: frame.frameTime,
        frameNumber: frame.frameNumber,
        points3D: frame.landmarks3D.map((landmark, index) => ({
        x: landmark.x * 1000, // 轉換為毫米
        y: landmark.y * 1000,
        z: landmark.z * 1000,
        keypointIndex: allowedIndices[index], // 使用過濾後的索引
        confidence: frame.confidence[index] || 0.8,
        enhanced: false
        })),
        landmarks2D: {
        cam1: frame.landmarks2D,
        cam2: []
        },
        stereoStats: {
        totalPoints: frame.landmarks3D.length,
        avgDepth: frame.landmarks3D.reduce((sum, p) => sum + p.z, 0) / frame.landmarks3D.length * 1000,
        avgConfidence: frame.confidence.reduce((sum, c) => sum + c, 0) / frame.confidence.length,
        validPoints: frame.confidence.filter(c => c > 0.7).length,
        enhancementMode: 'mediapipe'
        },
        fps: 30
    }));

    const bvhData = await bvhExporterRef.current.exportMotionData(formattedData, {
        fps: 30,
        skeletonType: 'mediapipe',
        quality: 'high'
    });

    // 下載 BVH 文件
    const blob = new Blob([bvhData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pose_motion_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.bvh`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('BVH 文件匯出成功');
    } catch (error) {
    console.error('BVH 匯出失敗:', error);
    setError('BVH 匯出失敗: ' + error.message);
    }
};