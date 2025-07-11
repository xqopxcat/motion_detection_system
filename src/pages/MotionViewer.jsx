import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { initScene } from '../scenes/init'; // 假設有一個 initScene 函數來初始化場景
import { addLights, addFloor } from '../scenes/lightsAndFloor'; // 假設有一個模組來添加光源和地板
import { makeTextSprite } from "../scenes/modules";
import ControlPanel from "../components/Viewer/ControlPanel";
import ActionDataPanel from "../components/Viewer/ActionDataPanel";
import VideoPanel from "../components/Viewer/VideoPanel";
import PanelLayout from "../components/Viewer/PanelLayout";
import { loadBVHAndInitSkeleton, loadFBXAndInitSkeleton, loadLandmarkAndInitSkeleton } from "../scenes/loadFile";

const boneMeshes = [];
const jointSpheres = [];

export function highlightSelectedJoint(jointSpheres, selectedJointName, comparedJointName) {
    jointSpheres.forEach(({ bone, sphere }) => {
        if (bone.name === selectedJointName) {
            sphere.material.color.set(0x00ffff); // 主選擇關節：青色
        } else if (bone.name === comparedJointName) {
            sphere.material.color.set(0xffff00); // 比較關節：黃色
        } else {
            sphere.material.color.set(0xff0000); // 其他：紅色
        }
    });
}

const MotionViewer = () => {
    const mountRef = useRef(null);
    const [showControlPanel, setShowControlPanel] = useState(false); // 預設收合狀態
    const [showActionPanel, setShowActionPanel] = useState(false);
    const [annotations, setAnnotations] = useState([]);
    const [speed, setSpeed] = useState(0.5);      // 控制播放速率
    const [progress, setProgress] = useState(0);  // 控制播放進度條
    const [frameNumber, setFrameNumber] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [frameStep, setFrameStep] = useState(false);
    const [isBVHLoaded, setIsBVHLoaded] = useState(true)
    const [isFBXLoaded, setIsFBXLoaded] = useState(false)
    const [isLandmarkLoaded, setIsLandmarkLoaded] = useState(false)
    const [joints, setJoints] = useState([]); // 用於存儲骨架關節
    const [selectedJoint, setSelectedJoint] = useState('');
    const [comparedJoint, setComparedJoint] = useState('');
     
    // 新增影片相關狀態
    const [videoSrc, setVideoSrc] = useState(null);
    const [showVideoPanel, setShowVideoPanel] = useState(false);

    const [currentFrameData, setCurrentFrameData] = useState({
        angle: 0,
        angleX: 0,
        angleY: 0,
        angleZ: 0,
        centerX: 0,
        centerY: 0,
        centerZ: 0,
        centerMove: 0,
        centerDirection: new THREE.Vector3(1, 0, 0), // 重心移動方向
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

        // 選擇要加載的數據類型（三選一）
        
        // BVH 加載
        // loadBVHAndInitSkeleton({
        //     bvhUrl: '/pirouette.bvh',
        //     scene,
        //     camera,
        //     renderer,
        //     setJoints,
        //     setSelectedJoint,
        //     setComparedJoint,
        //     boneMeshes,
        //     jointSpheres,
        //     jointMapRef,
        //     setAnnotations,
        //     setIsBVHLoaded,
        //     setProgress,
        //     setFrameNumber,
        //     setCurrentFrameData,
        //     mixerRef,
        //     frameRef,
        //     isPausedRef,
        //     speedRef,
        //     selectedJointRef,
        //     comparedJointRef,
        //     hipsPositionsRef,
        //     animate,
        // });
        
        // FBX 加載
        // loadFBXAndInitSkeleton({
        //     fbxUrl: '/Freehang_Climb.fbx',
        //     scene,
        //     camera,
        //     renderer,
        //     setJoints,
        //     setSelectedJoint,
        //     setComparedJoint,
        //     boneMeshes,
        //     jointSpheres,
        //     jointMapRef,
        //     setAnnotations,
        //     setIsFBXLoaded,
        //     setProgress,
        //     setFrameNumber,
        //     setCurrentFrameData,
        //     mixerRef,
        //     frameRef,
        //     isPausedRef,
        //     speedRef,
        //     selectedJointRef,
        //     comparedJointRef,
        //     hipsPositionsRef,
        //     animate,
        // });

        // Landmark 加載
        loadLandmarkAndInitSkeleton({
            landmarkUrl: '/pose_landmarks_2025-07-09T12-54-47.json',
            scene,
            camera,
            renderer,
            setJoints,
            setSelectedJoint,
            setComparedJoint,
            boneMeshes,
            jointSpheres,
            jointMapRef,
            setAnnotations,
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
        });
        
        // loadFBXAndInitSkeleton({
        //     fbxUrl: '/Freehang_Climb.fbx',
        //     scene,
        //     camera,
        //     renderer,
        //     setJoints,
        //     setSelectedJoint,
        //     setComparedJoint,
        //     boneMeshes,
        //     jointSpheres,
        //     jointMapRef,
        //     setAnnotations,
        //     setIsFBXLoaded,
        //     setProgress,
        //     setFrameNumber,
        //     setCurrentFrameData,
        //     mixerRef,
        //     frameRef,
        //     isPausedRef,
        //     speedRef,
        //     selectedJointRef,
        //     comparedJointRef,
        //     hipsPositionsRef,
        //     animate,
        // });

        // 處理視窗大小調整
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            if (scene.userData.angleArrowHelper) {
                scene.remove(scene.userData.angleArrowHelper);
                scene.userData.angleArrowHelper = null;
            }
            mount.removeChild(renderer.domElement);
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    
    useEffect(() => {
        if (frameStep && mixerRef.current) {
            const action = mixerRef.current._actions[0];
            const clip = action._clip;
            const fps = 1 / clip.tracks[0].times[1] - clip.tracks[0].times[0] || 30;
            mixerRef.current.update(1 / Math.floor(fps)); // 假設 30fps
            setFrameStep(false);
        }
    }, [frameStep, frameNumber]);

        const handleRemoveVideo = () => {
        setVideoSrc(null);
    };
    
    return (
        <>
            <PanelLayout
                leftPanel={<div ref={mountRef} style={{ width: '100%', height: '100%' }} />}
                rightPanel={showVideoPanel ? (
                    <VideoPanel
                        videoSrc={videoSrc}
                        onVideoFileChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const url = URL.createObjectURL(file);
                                setVideoSrc(url);
                            }
                        }}
                        onVideoRemove={handleRemoveVideo} 
                        onClose={() => setShowVideoPanel(false)}
                    />
                ) : null}
            />
            {(isBVHLoaded || isFBXLoaded || isLandmarkLoaded) && (
                <ControlPanel
                    showControlPanel={ showControlPanel }
                    onToggleControlPanel={() => setShowControlPanel(!showControlPanel)}
                    showVideoPanel={showVideoPanel}
                    onToggleVideoPanel={() => setShowVideoPanel(!showVideoPanel)}
                    annotations={annotations}
                    onAnnotationFocus={ann => {
                        // 例如讓相機聚焦到 ann.bone
                        if (ann.bone) {
                            const pos = ann.bone.getWorldPosition(new THREE.Vector3());
                            cameraRef.current.position.lerp(pos, 0.5); // 或自訂聚焦動畫
                        }
                    }}
                    onAnnotationDelete={idx => {
                        setAnnotations(prev => {
                            const annotation = prev[idx];
                            if (annotation?.marker && annotation.marker.parent) {
                                annotation.marker.parent.remove(annotation.marker);
                            }
                            if (annotation?.sprite && annotation.sprite.parent) {
                                annotation.sprite.parent.remove(annotation.sprite);
                            }
                            return prev.filter((_, i) => i !== idx)
                        });
                    }}
                    onAnnotationEdit={(idx, newText) => {
                        setAnnotations(prev => prev.map((ann, i) => {
                            if (i === idx) {
                                // 1. 產生新的 sprite
                                const newSprite = makeTextSprite(`${ann.info.frame} ${ann.bone?.name}: ${newText}`);
                                // 2. 保持 sprite 位置不變
                                newSprite.position.copy(ann.sprite.position);
                                // 3. 用新 sprite 替換舊 sprite
                                if (ann.sprite && ann.sprite.parent) {
                                    ann.sprite.parent.add(newSprite);
                                    ann.sprite.parent.remove(ann.sprite);
                                }
                                // 4. 回傳新的 annotation
                                return {
                                    ...ann,
                                    sprite: newSprite,
                                    info: { ...ann.info, text: newText }
                                };
                            }
                            return ann;
                        }));
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
        </>
    )
}

export default MotionViewer;

// 動畫循環
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
        
        // 進度條計算 && 幀數計算
        if (mixer && mixer._actions[0]?._clip) {
            const action = mixer._actions[0];
            const clip = action._clip;
            const time = action.time !== undefined ? action.time : mixer.time;
            let fps = 30; // 預設 fps
            
            if (mixer._isLandmarkMixer) {
                // Landmark mixer 特殊處理
                fps = 30;
                const frame = mixer._currentFrame || 0;
                if (onFrame) onFrame(frame);
                const progress = Math.min(frame / (mixer._totalFrames - 1), 1);
                if (onProgerss) onProgerss(progress);
            } else {
                // 標準 Three.js mixer
                fps = 1 / clip.tracks[0].times[1] - clip.tracks[0].times[0] || 30;
                const frame = Math.floor(time * fps);
                if (onFrame) onFrame(frame);
                const progress = Math.min(time / clip.duration, 1);
                if (onProgerss) onProgerss(progress);
            }
        }
        
        // 更新骨架圓柱
        boneMeshes.forEach(({ bone, mesh, endBone }) => {
            if (endBone) {
                // Landmark 骨架處理（有明確的起始和結束骨骼）
                const startPosition = bone.getWorldPosition(new THREE.Vector3());
                const endPosition = endBone.getWorldPosition(new THREE.Vector3());
                const direction = new THREE.Vector3().subVectors(endPosition, startPosition);
                const length = direction.length();
                
                if (length > 0.1) { // 避免長度太小
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
                // 標準 BVH/FBX 骨架處理
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

        // 更新 centerHip 球體位置
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

        // 更新 chest 球體位置
        if (chestSphere && jointMapRef.current['chest']) {
            const chestBone = jointMapRef.current['chest'];
            const chestPos = chestBone.getWorldPosition(new THREE.Vector3());
            chestSphere.position.copy(chestPos);
            chestSphere.visible = true;
        }
        
        // 重心座標（支援不同格式）
        const hips = jointMapRef.current["hip"] || jointMapRef.current["Hips"] || 
                    jointMapRef.current["mixamorigHips"] || jointMapRef.current["mixamorig:Hips"] ||
                    jointMapRef.current["center_hip"]; // landmark centerHip
        const neck = jointMapRef.current["neck"] || jointMapRef.current["Neck"] || 
                    jointMapRef.current["mixamorigNeck"] || jointMapRef.current["mixamorig:Neck"] ||
                    jointMapRef.current["nose"]; // landmark 格式（用 nose 代替 neck）
        if (hips) {
            const hipsPos = hips.getWorldPosition(new THREE.Vector3());
            const neckPos = neck.getWorldPosition(new THREE.Vector3());
            const axisDir = new THREE.Vector3().subVectors(neckPos, hipsPos).normalize();
            const axisLength = hipsPos.distanceTo(neckPos);
            const xAxis = new THREE.Vector3(1, 0, 0);
            const inclination = axisDir.angleTo(xAxis) * 180 / Math.PI;
            const nowFrame = Math.max(0, frameRef.current); // 當前幀
            const prevFrame = Math.max(0, nowFrame - 1);

            const nowHips = hipsPositionsRef.current[nowFrame];
            const prevHips = hipsPositionsRef.current[prevFrame];
            let moveDir = new THREE.Vector3();
            let moveLength = 0;

            if (nowHips && prevHips) {
                moveDir = nowHips.clone().sub(prevHips);
                moveLength = moveDir.length();
            }
            const dir = moveDir.length() > 0.001 ? moveDir.clone().normalize() : new THREE.Vector3(1, 0, 0); // 單位向量
            const actualDir = dir.clone().multiplyScalar(moveLength); // 移動向量
            // 用 ArrowHelper 標示重心運動軸心
            if (!scene.userData.centerMoveArrow) {
                scene.userData.centerMoveArrow = new THREE.ArrowHelper(
                    dir,
                    hipsPos,
                    Math.max(moveLength * 10, 10), // 放大顯示
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
                centerMove: moveLength.toFixed(2), // 重心移動距離
                centerDirection: actualDir, // 重心移動方向
                inclination: inclination.toFixed(2), // 重心對X軸的傾斜角度
            }));
        }
        

        // 指定關節的姿態差異角度
        const sel = jointMapRef.current[selectedJointRef.current];
        const parent = sel?.parent;
        const compared = jointMapRef.current[comparedJointRef.current];
        let angleDeg = 0;
        let jointDistance = 0;
        if (sel && parent) {
            // 取得兩個骨頭的世界旋轉
            const selQuat = sel.getWorldQuaternion(new THREE.Quaternion());
            const parentQuat = parent.getWorldQuaternion(new THREE.Quaternion());
            // 相對旋轉
            const relativeQuat = selQuat.clone().invert().multiply(parentQuat);
            // 轉成歐拉角（XYZ順序）
            const relativeEuler = new THREE.Euler().setFromQuaternion(relativeQuat, 'XYZ');
            // 取得每個軸向的角度（單位：度）
            const angleX = THREE.MathUtils.radToDeg(relativeEuler.x); // X軸（左右，Pitch）
            const angleY = THREE.MathUtils.radToDeg(relativeEuler.y); // Y軸（上下，Yaw）
            const angleZ = THREE.MathUtils.radToDeg(relativeEuler.z); // Z軸（扭轉，Roll）
            const angleRad = 2 * Math.acos(Math.min(Math.max(relativeQuat.w, -1), 1));
            angleDeg = angleRad * (180 / Math.PI);
            // angleDeg = Math.acos(
            //     2 * Math.pow(selQuat.dot(comparedQuat), 2) - 1
            // ) * (180 / Math.PI);
            onSetCurrentFrameData(prev => ({
                ...prev,
                angle: angleDeg.toFixed(2),   // 總體旋轉角度
                angleX: angleX.toFixed(2),    // X軸（左右，Pitch）
                angleY: angleY.toFixed(2),    // Y軸（上下，Yaw）
                angleZ: angleZ.toFixed(2),    // Z軸（扭轉，Roll）
            }));
            // 夾角方向視覺化
            // 取得旋轉軸與角度
            // const axis = new THREE.Vector3(1, 0, 0); // 預設
            // let angle = 0;
            // relativeQuat.normalize();
            // angle = 2 * Math.acos(Math.min(Math.max(relativeQuat.w, -1), 1));
            // const s = Math.sqrt(1 - relativeQuat.w * relativeQuat.w);
            // if (s > 0.0001) {
            //     axis.set(
            //         relativeQuat.x / s,
            //         relativeQuat.y / s,
            //         relativeQuat.z / s
            //     );
            // }
            // // 箭頭起點設在 sel 關節
            // const start = sel.getWorldPosition(new THREE.Vector3());
            // // 箭頭長度與方向
            // const length = 40; // 可依需求調整
            // const dir = axis.clone().normalize();
            //  // 只建立一次 ArrowHelper
            // if (!scene.userData.angleArrowHelper) {
            //     scene.userData.angleArrowHelper = new THREE.ArrowHelper(
            //         dir, start, length, 0x00ff00, 10, 5
            //     );
            //     scene.add(scene.userData.angleArrowHelper);
            // } else {
            //     const angleArrowHelper = scene.userData.angleArrowHelper;
            //     if (angleArrowHelper && !scene.children.includes(angleArrowHelper)) {
            //         scene.add(angleArrowHelper);
            //     }
            //     angleArrowHelper.position.copy(start);
            //     angleArrowHelper.setDirection(dir);
            //     angleArrowHelper.setLength(length, 10, 5);
            //     angleArrowHelper.setColor(0x00ff00);
            //     angleArrowHelper.visible = angle > 0.01;
            // }
        }
        // 相對關節距離
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
