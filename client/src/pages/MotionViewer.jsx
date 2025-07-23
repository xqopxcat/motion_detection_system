import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { useParams } from 'react-router-dom';
import { initScene } from '../scenes/init';
import { addLights, addFloor } from '../scenes/lightsAndFloor';
import ControlPanel from "../components/Viewer/ControlPanel";
import ActionDataPanel from "../components/Viewer/ActionDataPanel";
import VideoPanel from "../components/Viewer/VideoPanel";
import PanelLayout from "../components/Viewer/PanelLayout";
import { fetchAnnotationMark, fetchLandmark } from "../scenes/loadData";
import { useGetMotionDetailsQuery } from "../redux/services/motionCoreAPI";
import { useGetAnnotationsQuery, useUpdateAnnotationMutation, useDeleteAnnotationMutation } from "../redux/services/annotationCoreAPI";
import { useDeviceDetection } from "../hooks/useDeviceDetection";
import './MotionViewer.scss';

const boneMeshes = [];
const jointSpheres = [];

export function highlightSelectedJoint(jointSpheres, selectedJointName, comparedJointName) {
    jointSpheres.forEach(({ bone, sphere }) => {
        if (bone.name === selectedJointName) {
            sphere.material.color.set(0x00ffff);
        } else if (bone.name === comparedJointName) {
            sphere.material.color.set(0xffff00);
        } else {
            sphere.material.color.set(0xff0000);
        }
    });
}

const MotionViewer = () => {
    const mountRef = useRef(null);
    const [showControlPanel, setShowControlPanel] = useState(false);
    const [showActionPanel, setShowActionPanel] = useState(false);
    const [showVideoPanel, setShowVideoPanel] = useState(false);
    const { isMobile } = useDeviceDetection();
    
    // ...existing state...
    const [speed, setSpeed] = useState(0.5);
    const [progress, setProgress] = useState(0);
    const [frameNumber, setFrameNumber] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [frameStep, setFrameStep] = useState(false);
    const [isBVHLoaded, setIsBVHLoaded] = useState(true)
    const [isFBXLoaded, setIsFBXLoaded] = useState(false)
    const [isLandmarkLoaded, setIsLandmarkLoaded] = useState(false)
    const [joints, setJoints] = useState([]);
    const [selectedJoint, setSelectedJoint] = useState('');
    const [comparedJoint, setComparedJoint] = useState('');
    const [videoSrc, setVideoSrc] = useState(null);
    const [currentFrameData, setCurrentFrameData] = useState({
        angle: 0,
        angleX: 0,
        angleY: 0,
        angleZ: 0,
        centerX: 0,
        centerY: 0,
        centerZ: 0,
        centerMove: 0,
        centerDirection: new THREE.Vector3(1, 0, 0),
        inclination: 0,
        jointDistance: 0,
    });
    const mixerRef = useRef(null);
    const isPausedRef = useRef(isPaused);
    const speedRef = useRef(speed);
    const frameRef = useRef(frameNumber);
    const cameraRef = useRef(null);
    const jointMapRef = useRef({});
    const selectedJointRef = useRef('');
    const comparedJointRef = useRef('');
    const hipsPositionsRef = useRef([]);
    const { id: sessionId } = useParams();
    const { data: motionData, isLoading: isMotionsLoading } = useGetMotionDetailsQuery(sessionId);
    const { data: annotationsData, isLoading: isAnnotationsLoading } = useGetAnnotationsQuery(sessionId);
    const [updateAnnotation] = useUpdateAnnotationMutation();
    const [deleteAnnotation] = useDeleteAnnotationMutation();

    // 處理響應式設計
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            
            // 在手機上自動關閉側邊面板以節省空間
            if (width <= 768) {
                setShowActionPanel(false);
                setShowVideoPanel(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 監聽面板狀態變化，重新調整渲染器尺寸
    useEffect(() => {
        if (cameraRef.current && mountRef.current) {
            const mount = mountRef.current;
            const renderer = mount.querySelector('canvas')?.getContext('webgl')?.canvas?.renderer;
            
            if (renderer) {
                const handleResize = () => {
                    const width = mount.clientWidth;
                    const height = mount.clientHeight;
                    cameraRef.current.aspect = width / height;
                    cameraRef.current.updateProjectionMatrix();
                    renderer.setSize(width, height);
                };
                
                // 延遲執行以確保 CSS 動畫完成
                const timer = setTimeout(handleResize, 300);
                return () => clearTimeout(timer);
            }
        }
    }, [showControlPanel, showActionPanel, showVideoPanel, isMobile]);

    // ...existing useEffect hooks...
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        selectedJointRef.current = selectedJoint;
    }, [selectedJoint]);

    useEffect(() => {
        comparedJointRef.current = comparedJoint;
    }, [comparedJoint]);
    
    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);
    
    useEffect(() => {
        frameRef.current = frameNumber;
    }, [frameNumber]);
    
    useEffect(() => {
        const mount = mountRef.current;
        const { scene, camera, renderer } = initScene(mount);
        cameraRef.current = camera;
        addLights(scene);
        addFloor(scene);
        
        if (!isMotionsLoading && motionData) {
          setVideoSrc(motionData?.data?.videoUrl);
          fetchLandmark({
            landmarkData: motionData?.data?.frameData,
            scene,
            camera,
            renderer,
            setJoints,
            setSelectedJoint,
            setComparedJoint,
            boneMeshes,
            jointSpheres,
            jointMapRef,
            setIsLandmarkLoaded,
            setProgress,
            setFrameNumber,
            setCurrentFrameData,
            mixerRef,
            frameRef,
            isPausedRef,
            speedRef,
            selectedJointRef,
            comparedJointRef,
            hipsPositionsRef,
            animate,
            sessionId
          });
        }
        
        if (!isAnnotationsLoading && annotationsData) {
          fetchAnnotationMark(scene, annotationsData?.data);
        }

        // 改進的尺寸調整處理
        const handleResize = () => {
            if (camera && renderer && mount) {
                const width = mount.clientWidth;
                const height = mount.clientHeight;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            }
        };

        // 初始化時調整尺寸
        setTimeout(handleResize, 100);
        
        // 添加 ResizeObserver 以監聽容器尺寸變化
        let resizeObserver;
        if (mount && window.ResizeObserver) {
            resizeObserver = new ResizeObserver(() => {
                handleResize();
            });
            resizeObserver.observe(mount);
        }

        window.addEventListener('resize', handleResize);

        return () => {
            if (scene.userData.angleArrowHelper) {
                scene.remove(scene.userData.angleArrowHelper);
                scene.userData.angleArrowHelper = null;
            }
            mount.removeChild(renderer.domElement);
            window.removeEventListener('resize', handleResize);
        };
    }, [motionData, isMotionsLoading, annotationsData, isAnnotationsLoading]);
    
    useEffect(() => {
        if (frameStep && mixerRef.current) {
            const action = mixerRef.current._actions[0];
            const clip = action._clip;
            const fps = 1 / clip.tracks[0].times[1] - clip.tracks[0].times[0] || 30;
            mixerRef.current.update(1 / Math.floor(fps));
            setFrameStep(false);
        }
    }, [frameStep, frameNumber]);

    const handleRemoveVideo = () => {
        setVideoSrc(null);
    };

    // 行動裝置專用的面板切換邏輯
    const handleMobilePanelToggle = (panelType) => {
        if (isMobile) {
            // 在手機上，一次只能開啟一個面板
            switch (panelType) {
                case 'control':
                    setShowControlPanel(!showControlPanel);
                    setShowActionPanel(false);
                    setShowVideoPanel(false);
                    break;
                case 'action':
                    setShowActionPanel(!showActionPanel);
                    setShowControlPanel(false);
                    setShowVideoPanel(false);
                    break;
                case 'video':
                    setShowVideoPanel(!showVideoPanel);
                    setShowControlPanel(false);
                    setShowActionPanel(false);
                    break;
            }
        } else {
            // 桌面版維持原有邏輯
            switch (panelType) {
                case 'control':
                    setShowControlPanel(!showControlPanel);
                    break;
                case 'action':
                    setShowActionPanel(!showActionPanel);
                    break;
                case 'video':
                    setShowVideoPanel(!showVideoPanel);
                    break;
            }
        }
    };
    
    return (
        <div className={`motion-viewer ${isMobile && 'mobile'}`}>
            <div className={`viewer-content ${showControlPanel || showActionPanel || showVideoPanel ? 'active' : ''}`}>
                <PanelLayout
                    leftPanel={
                        <div 
                            ref={mountRef} 
                            style={{ 
                                width: '100%', 
                                height: isMobile && (showControlPanel || showActionPanel || showVideoPanel) ? '60vh' : '100%',
                                transition: 'height 0.3s ease'
                            }} 
                        />
                    }
                    rightPanel={!isMobile && showVideoPanel ? (
                        <VideoPanel
                            videoSrc={videoSrc}
                            onClose={() => setShowVideoPanel(false)}
                        />
                    ) : null}
                />
            </div>

            {/* 浮動控制按鈕 */}
            {isMobile && (
              <div className="floating-controls">
                <button
                    className={`floating-btn ${showControlPanel ? 'active' : ''}`}
                    onClick={() => handleMobilePanelToggle('control')}
                    title="控制面板"
                >
                    ⚙️
                </button>
                <button
                    className={`floating-btn ${showActionPanel ? 'active' : ''}`}
                    onClick={() => handleMobilePanelToggle('action')}
                    title="動作數據"
                >
                    📊
                </button>
                <button
                    className={`floating-btn ${showVideoPanel ? 'active' : ''}`}
                    onClick={() => handleMobilePanelToggle('video')}
                    title="影片"
                >
                    🎥
                </button>
              </div>
            )}

            {/* 行動裝置面板 */}
            {isMobile && (showControlPanel || showActionPanel || showVideoPanel) && (
                <div className="mobile-panels">
                    <div className="mobile-panel-tabs">
                        <button
                            className={`mobile-tab ${showControlPanel ? 'active' : ''}`}
                            onClick={() => handleMobilePanelToggle('control')}
                        >
                            控制
                        </button>
                        <button
                            className={`mobile-tab ${showActionPanel ? 'active' : ''}`}
                            onClick={() => handleMobilePanelToggle('action')}
                        >
                            數據
                        </button>
                        <button
                            className={`mobile-tab ${showVideoPanel ? 'active' : ''}`}
                            onClick={() => handleMobilePanelToggle('video')}
                        >
                            影片
                        </button>
                    </div>

                    {showControlPanel && (isBVHLoaded || isFBXLoaded || isLandmarkLoaded) && (
                        <ControlPanel
                            showControlPanel={true}
                            onToggleControlPanel={() => handleMobilePanelToggle('control')}
                            showVideoPanel={showVideoPanel}
                            onToggleVideoPanel={() => handleMobilePanelToggle('video')}
                            annotations={annotationsData?.data}
                            onAnnotationFocus={ann => {
                                if (ann) {
                                    const pos = new THREE.Vector3(ann.position.x, ann.position.y, ann.position.z);
                                    cameraRef.current.position.lerp(pos, 0.5);
                                }
                            }}
                            onAnnotationDelete={id => {
                                deleteAnnotation(id);
                            }}
                            onAnnotationEdit={(id, newText) => {
                                updateAnnotation({
                                    annotationId: id,
                                    text: newText
                                });
                            }}
                            frameNumber={frameNumber}
                            frameRef={frameRef}
                            mixerRef={mixerRef}
                            setFrameNumber={setFrameNumber}
                            isPaused={isPaused}
                            setIsPaused={setIsPaused}
                            setFrameStep={setFrameStep}
                            speed={speed}
                            setSpeed={setSpeed}
                            progress={progress}
                            setProgress={setProgress}
                            isMobile={isMobile}
                        />
                    )}

                    {showActionPanel && (
                        <ActionDataPanel
                            showActionPanel={true}
                            onToggleActionPanel={() => handleMobilePanelToggle('action')}
                            jointsList={joints}
                            selectedJoint={selectedJoint}
                            comparedJoint={comparedJoint}
                            onJointChange={jointName => {
                                setSelectedJoint(jointName);
                                highlightSelectedJoint(jointSpheres, jointName, comparedJoint);
                            }}
                            onComparedJointChange={jointName => {
                                setComparedJoint(jointName);
                                highlightSelectedJoint(jointSpheres, selectedJoint, jointName);
                            }}
                            frameData={currentFrameData}
                            onFrameDataChange={(data) => {
                                setCurrentFrameData(data);
                            }}
                            isMobile={isMobile}
                        />
                    )}

                    {showVideoPanel && (
                        <VideoPanel
                            videoSrc={videoSrc}
                            onClose={() => handleMobilePanelToggle('video')}
                            isMobile={isMobile}
                        />
                    )}
                </div>
            )}

            {/* 桌面版面板 */}
            {!isMobile && (isBVHLoaded || isFBXLoaded || isLandmarkLoaded) && (
                <ControlPanel
                    showControlPanel={showControlPanel}
                    onToggleControlPanel={() => setShowControlPanel(!showControlPanel)}
                    showVideoPanel={showVideoPanel}
                    onToggleVideoPanel={() => setShowVideoPanel(!showVideoPanel)}
                    annotations={annotationsData?.data}
                    onAnnotationFocus={ann => {
                        if (ann) {
                            const pos = new THREE.Vector3(ann.position.x, ann.position.y, ann.position.z);
                            cameraRef.current.position.lerp(pos, 0.5);
                        }
                    }}
                    onAnnotationDelete={id => {
                        deleteAnnotation(id);
                    }}
                    onAnnotationEdit={(id, newText) => {
                        updateAnnotation({
                          annotationId: id,
                          text: newText
                        });
                    }}
                    frameNumber={frameNumber}
                    frameRef={frameRef}
                    mixerRef={mixerRef}
                    setFrameNumber={setFrameNumber}
                    isPaused={isPaused}
                    setIsPaused={setIsPaused}
                    setFrameStep={setFrameStep}
                    speed={speed}
                    setSpeed={setSpeed}
                    progress={progress}
                    setProgress={setProgress}
                />
            )}

            {!isMobile && (
                <ActionDataPanel
                    showActionPanel={showActionPanel}
                    onToggleActionPanel={() => setShowActionPanel(!showActionPanel)}
                    jointsList={joints}
                    selectedJoint={selectedJoint}
                    comparedJoint={comparedJoint}
                    onJointChange={jointName => {
                        setSelectedJoint(jointName);
                        highlightSelectedJoint(jointSpheres, jointName, comparedJoint);
                    }}
                    onComparedJointChange={jointName => {
                        setComparedJoint(jointName);
                        highlightSelectedJoint(jointSpheres, selectedJoint, jointName);
                    }}
                    frameData={currentFrameData}
                    onFrameDataChange={(data) => {
                        setCurrentFrameData(data);
                    }}
                />
            )}
        </div>
    )
}

export default MotionViewer;

function animate({
    renderer,
    scene,
    camera,
    mixer,
    boneMeshes,
    jointSpheres,
    centerHipSphere,
    chestSphere,
    isPausedRef,
    speedRef,
    onProgerss,
    onFrame,
    jointMapRef,
    selectedJointRef,
    comparedJointRef,
    hipsPositionsRef,
    frameRef,
    onSetCurrentFrameData,
}) {
    const clock = new THREE.Clock();
    function loop() {
        requestAnimationFrame(loop);
        const delta = clock.getDelta();
        if (!isPausedRef.current && mixer) {
            mixer.update(delta * speedRef.current);
        };
        
        if (mixer && mixer._actions[0]?._clip) {
            const action = mixer._actions[0];
            const clip = action._clip;
            const time = action.time !== undefined ? action.time : mixer.time;
            let fps = 30;
            
            if (mixer._isLandmarkMixer) {
                fps = 30;
                const frame = mixer._currentFrame || 0;
                if (onFrame) onFrame(frame);
                const progress = Math.min(frame / (mixer._totalFrames - 1), 1);
                if (onProgerss) onProgerss(progress);
            } else {
                fps = 1 / clip.tracks[0].times[1] - clip.tracks[0].times[0] || 30;
                const frame = Math.floor(time * fps);
                if (onFrame) onFrame(frame);
                const progress = Math.min(time / clip.duration, 1);
                if (onProgerss) onProgerss(progress);
            }
        }
        
        boneMeshes.forEach(({ bone, mesh, endBone }) => {
            if (endBone) {
                const startPosition = bone.getWorldPosition(new THREE.Vector3());
                const endPosition = endBone.getWorldPosition(new THREE.Vector3());
                const direction = new THREE.Vector3().subVectors(endPosition, startPosition);
                const length = direction.length();
                
                if (length > 0.1) {
                    mesh.position.copy(startPosition.clone().add(direction.multiplyScalar(0.5)));
                    mesh.quaternion.setFromUnitVectors(
                        new THREE.Vector3(0, 1, 0),
                        direction.clone().normalize()
                    );
                    mesh.scale.set(1, length / mesh.geometry.parameters.height, 1);
                    mesh.visible = true;
                } else {
                    mesh.visible = false;
                }
            } else {
                const parentPosition = bone.parent.getWorldPosition(new THREE.Vector3());
                const childPosition = bone.getWorldPosition(new THREE.Vector3());
                const direction = new THREE.Vector3().subVectors(childPosition, parentPosition);
                const length = direction.length();
                mesh.position.copy(parentPosition.clone().add(direction.multiplyScalar(0.5)));
                mesh.quaternion.setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    direction.clone().normalize()
                );
                mesh.scale.set(1, length / mesh.geometry.parameters.height, 1);
            }
        });
        
        jointSpheres.forEach(({ bone, sphere }) => {
            const pos = bone.getWorldPosition(new THREE.Vector3());
            sphere.position.copy(pos);
        });

        if (centerHipSphere && hipsPositionsRef.current && frameRef.current !== undefined) {
            const currentFrame = frameRef.current;
            const centerHipPos = hipsPositionsRef.current[currentFrame];
            if (centerHipPos) {
                centerHipSphere.position.copy(centerHipPos);
                centerHipSphere.visible = true;
            } else {
                centerHipSphere.visible = false;
            }
        }

        if (chestSphere && jointMapRef.current['chest']) {
            const chestBone = jointMapRef.current['chest'];
            const chestPos = chestBone.getWorldPosition(new THREE.Vector3());
            chestSphere.position.copy(chestPos);
            chestSphere.visible = true;
        }
        
        const hips = jointMapRef.current["hip"] || jointMapRef.current["Hips"] || 
                    jointMapRef.current["mixamorigHips"] || jointMapRef.current["mixamorig:Hips"] ||
                    jointMapRef.current["center_hip"];
        const neck = jointMapRef.current["neck"] || jointMapRef.current["Neck"] || 
                    jointMapRef.current["mixamorigNeck"] || jointMapRef.current["mixamorig:Neck"] ||
                    jointMapRef.current["nose"];
        if (hips) {
            const hipsPos = hips.getWorldPosition(new THREE.Vector3());
            const neckPos = neck.getWorldPosition(new THREE.Vector3());
            const axisDir = new THREE.Vector3().subVectors(neckPos, hipsPos).normalize();
            const axisLength = hipsPos.distanceTo(neckPos);
            const xAxis = new THREE.Vector3(1, 0, 0);
            const inclination = axisDir.angleTo(xAxis) * 180 / Math.PI;
            const nowFrame = Math.max(0, frameRef.current);
            const prevFrame = Math.max(0, nowFrame - 1);

            const nowHips = hipsPositionsRef.current[nowFrame];
            const prevHips = hipsPositionsRef.current[prevFrame];
            let moveDir = new THREE.Vector3();
            let moveLength = 0;

            if (nowHips && prevHips) {
                moveDir = nowHips.clone().sub(prevHips);
                moveLength = moveDir.length();
            }
            const dir = moveDir.length() > 0.001 ? moveDir.clone().normalize() : new THREE.Vector3(1, 0, 0);
            const actualDir = dir.clone().multiplyScalar(moveLength);
            
            if (!scene.userData.centerMoveArrow) {
                scene.userData.centerMoveArrow = new THREE.ArrowHelper(
                    dir,
                    hipsPos,
                    Math.max(moveLength * 10, 10),
                    0x00ff00,
                    20,
                    10
                );
                scene.add(scene.userData.centerMoveArrow);
            } else {
                const arrow = scene.userData.centerMoveArrow;
                arrow.position.copy(hipsPos);
                arrow.setDirection(dir);
                arrow.setLength(Math.max(moveLength * 10, 10));
                arrow.visible = moveLength > 0.001;
            }

            if (!scene.userData.bodyAxisArrow) {
                scene.userData.bodyAxisArrow = new THREE.ArrowHelper(
                    axisDir,
                    hipsPos,
                    axisLength,
                    0x0000ff,
                    20,
                    10
                );
                scene.add(scene.userData.bodyAxisArrow);
            } else {
                const bodyAxisArrow = scene.userData.bodyAxisArrow;
                bodyAxisArrow.position.copy(hipsPos);
                bodyAxisArrow.setDirection(axisDir);
                bodyAxisArrow.setLength(axisLength);
                bodyAxisArrow.visible = true;
            }
            onSetCurrentFrameData(prev => ({
                ...prev,
                centerX: hipsPos.x.toFixed(2),
                centerY: hipsPos.y.toFixed(2),
                centerZ: hipsPos.z.toFixed(2),
                centerMove: moveLength.toFixed(2),
                centerDirection: actualDir,
                inclination: inclination.toFixed(2),
            }));
        }
        
        const sel = jointMapRef.current[selectedJointRef.current];
        const parent = sel?.parent;
        const compared = jointMapRef.current[comparedJointRef.current];
        let angleDeg = 0;
        let jointDistance = 0;
        if (sel && parent) {
            const selQuat = sel.getWorldQuaternion(new THREE.Quaternion());
            const parentQuat = parent.getWorldQuaternion(new THREE.Quaternion());
            const relativeQuat = selQuat.clone().invert().multiply(parentQuat);
            const relativeEuler = new THREE.Euler().setFromQuaternion(relativeQuat, 'XYZ');
            const angleX = THREE.MathUtils.radToDeg(relativeEuler.x);
            const angleY = THREE.MathUtils.radToDeg(relativeEuler.y);
            const angleZ = THREE.MathUtils.radToDeg(relativeEuler.z);
            const angleRad = 2 * Math.acos(Math.min(Math.max(relativeQuat.w, -1), 1));
            angleDeg = angleRad * (180 / Math.PI);
            onSetCurrentFrameData(prev => ({
                ...prev,
                angle: angleDeg.toFixed(2),
                angleX: angleX.toFixed(2),
                angleY: angleY.toFixed(2),
                angleZ: angleZ.toFixed(2),
            }));
        }
        
        if (sel && compared) {
            jointDistance = sel.getWorldPosition(new THREE.Vector3()).distanceTo(compared.getWorldPosition(new THREE.Vector3()));
            onSetCurrentFrameData(prev => ({
                ...prev,
                jointDistance: jointDistance.toFixed(2),
            }));
        }
        renderer.render(scene, camera);
    }

    loop();
}