import { useState, useEffect } from 'react';

export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    screenWidth: 0,
    screenHeight: 0,
    userAgent: '',
    platform: ''
  });

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // 檢測移動設備
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = screenWidth <= 768;
      const isMobile = isMobileDevice || isSmallScreen;

      // 檢測平板
      const isTabletDevice = /iPad|Android.*Tablet|Windows.*Touch/i.test(userAgent);
      const isMediumScreen = screenWidth > 768 && screenWidth <= 1024;
      const isTablet = isTabletDevice || isMediumScreen;

      // 桌面設備
      const isDesktop = !isMobile && !isTablet;

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth,
        screenHeight,
        userAgent,
        platform
      });
    };

    // 初始檢測
    detectDevice();

    // 監聽窗口大小變化
    const handleResize = () => {
      detectDevice();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
};