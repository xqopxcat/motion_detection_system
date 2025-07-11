import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader';
import { adjustCamera } from './init';
import { createBoneMeshes, createJointSpheres, calculateBoundingBox } from './createObject';
import { makeTextSprite } from "./modules";
import { highlightSelectedJoint } from "../pages/MotionViewer";

// 您的 landmark_data.json 包含的 17 個關節點索引：[0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]
// 對應的連接關係（使用數組索引 0-16）
const POSE_CONNECTIONS = [
    // 身體軀幹框架
    [1, 2],   // left_shoulder(index 1) - right_shoulder(index 2)
    [7, 8],   // left_hip(index 7) - right_hip(index 8) 
    [1, 7],   // left_shoulder(index 1) - left_hip(index 7)
    [2, 8],   // right_shoulder(index 2) - right_hip(index 8)
    
    // 左手臂
    [1, 3],   // left_shoulder(index 1) - left_elbow(index 3)
    [3, 5],   // left_elbow(index 3) - left_wrist(index 5)
    
    // 右手臂  
    [2, 4],   // right_shoulder(index 2) - right_elbow(index 4)
    [4, 6],   // right_elbow(index 4) - right_wrist(index 6)
    
    // 左腿
    [7, 9],   // left_hip(index 7) - left_knee(index 9)
    [9, 11],  // left_knee(index 9) - left_ankle(index 11)
    [11, 13],  // left_ankle - left_heel
    [11, 15],  // left_ankle - left_foot_index
    [13, 15],  // left_heel - left_foot_index
    
    // 右腿
    [8, 10],  // right_hip(index 8) - right_knee(index 10)  
    [10, 12], // right_knee(index 10) - right_ankle(index 12)
    [12, 14],  // right_ankle - right_heel
    [12, 16],  // right_ankle - right_foot_index
    [14, 16],  // right_heel - right_foot_index
    
    // 頭部到軀幹
    // [0, 1],   // nose(index 0) - left_shoulder(index 1)
    // [0, 2],   // nose(index 0) - right_shoulder(index 2)
];

// 15 個關節點名稱（按照您數據中的順序）
const JOINT_NAMES = [
    'nose',           // index 0 (MediaPipe index 0)
    'left_shoulder',  // index 1 (MediaPipe index 11)
    'right_shoulder', // index 2 (MediaPipe index 12)
    'left_elbow',     // index 3 (MediaPipe index 13)
    'right_elbow',    // index 4 (MediaPipe index 14)
    'left_wrist',     // index 5 (MediaPipe index 15)
    'right_wrist',    // index 6 (MediaPipe index 16)
    'left_hip',       // index 7 (MediaPipe index 23)
    'right_hip',      // index 8 (MediaPipe index 24)
    'left_knee',      // index 9 (MediaPipe index 25)
    'right_knee',     // index 10 (MediaPipe index 26)
    'left_ankle',     // index 11 (MediaPipe index 27)
    'right_ankle',    // index 12 (MediaPipe index 28)
    'left_heel',      // index 13 (MediaPipe index 29)
    'right_heel',     // index 14 (MediaPipe index 30)
    'left_foot_index',// index 15 (MediaPipe index 31)
    'right_foot_index'// index 16 (MediaPipe index 32)
];

export async function loadBVHAndInitSkeleton({
    bvhUrl,
    scene,
    camera,
    renderer,
    setJoints,
    setSelectedJoint,
    setComparedJoint,
    jointMapRef,
    boneMeshes,
    jointSpheres,
    setAnnotations,
    setIsBVHLoaded,
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
}) {
    return new Promise((resolve, reject) => {
        const loader = new BVHLoader();
        loader.load(bvhUrl, (result) => {
            console.log('BVH 加載完成', result);
            const boneRoot = result.skeleton.bones[0];
            const skeletonGroup = new THREE.Group();
            skeletonGroup.add(boneRoot);
            scene.add(skeletonGroup);

            // 取得所有骨頭
            const boneList = [];
            boneRoot.traverse(b => { if (b.isBone) boneList.push(b); });
            setJoints(boneList.map(b => b.name));
            setSelectedJoint(boneList[0]?.name || '');
            setComparedJoint(boneList[1]?.name || '');
            boneList.forEach(b => jointMapRef.current[b.name] = b);
            createBoneMeshes(boneRoot, boneMeshes, skeletonGroup);
            createJointSpheres(boneRoot, jointSpheres, skeletonGroup);
            highlightSelectedJoint(jointSpheres, boneList[0]?.name, boneList[1]?.name);
            
            renderer.domElement.addEventListener('click', e => onClick(e, renderer, camera, skeletonGroup, jointSpheres, setAnnotations, frameRef));

            // 邊界框與相機調整
            const { offset, center, size } = calculateBoundingBox(boneRoot);
            // skeletonGroup.position.y -= offset / 2;
            adjustCamera(camera, center, size);

            // 動畫
            const mixer = new THREE.AnimationMixer(boneRoot);
            mixer.clipAction(result.clip).setEffectiveWeight(1.0).play();
            mixerRef.current = mixer;
            setIsBVHLoaded(true);
            
            const hipsName = boneList.find(n => /hip/i.test(n.name))?.name || "Hips";
            const frameTimes = result.clip.tracks[0].times; // 假設每個track都是同一個長度
            for (let i = 0; i < frameTimes.length; i++) {
                mixer.setTime(frameTimes[i]);
                const hip = boneList.find(b => b.name === hipsName);
                if (hip) {
                    hipsPositionsRef.current[i] = hip.getWorldPosition(new THREE.Vector3());
                }
            }

            // 動畫循環
            animate({
                renderer, scene, camera, mixer,
                boneMeshes, jointSpheres,
                centerHipSphere: null, // BVH 不需要 centerHip
                chestSphere: null, // BVH 不需要 chest
                isPausedRef,
                speedRef,
                onProgerss: setProgress,
                onFrame: setFrameNumber,
                jointMapRef,
                selectedJointRef,
                comparedJointRef,
                hipsPositionsRef,
                frameRef,
                onSetCurrentFrameData: setCurrentFrameData,
            });

            resolve({
                boneRoot,
                skeletonGroup,
                boneList,
                boneMeshes,
                jointSpheres,
                mixer,
            });
        }, undefined, reject);
    });
}

export async function loadFBXAndInitSkeleton({
    fbxUrl,
    scene,
    camera,
    renderer,
    setJoints,
    setSelectedJoint,
    setComparedJoint,
    jointMapRef,
    boneMeshes,
    jointSpheres,
    setAnnotations,
    setIsFBXLoaded,
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
}) {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(fbxUrl, (object) => {
            scene.add(object);
            const boneList = [];
            object.traverse(child => {
                if (child.isBone) boneList.push(child);
            });
            setJoints(boneList.map(b => b.name));
            setSelectedJoint(boneList[0]?.name || '');
            setComparedJoint(boneList[1]?.name || '');
            boneList.forEach(b => jointMapRef.current[b.name] = b);
            createBoneMeshes(boneList[0], boneMeshes, object);
            createJointSpheres(boneList[0], jointSpheres, object);
            highlightSelectedJoint(jointSpheres, boneList[0]?.name, boneList[1]?.name);
            // // 將 FBX 加入場景
            console.log('FBX 加載完成', object, boneList[0]);

            renderer.domElement.addEventListener('click', (e) => onClick(e, renderer, camera, object, jointSpheres, setAnnotations, frameRef));

            // 邊界框與相機調整
            const { offset, center, size } = calculateBoundingBox(boneList[0]);
            object.position.y -= offset / 2;
            adjustCamera(camera, center, size);

            // 動畫
            let mixer = null;
            if (object.animations && object.animations.length > 0) {
                mixer = new THREE.AnimationMixer(object);
                mixer.clipAction(object.animations[0]).setEffectiveWeight(1.0).play();
                mixerRef.current = mixer;
            }
            setIsFBXLoaded(true);
            console.log(object.animations[0]);
            const hipsName = boneList.find(n => /hip/i.test(n.name))?.name || "Hips";
            const frameTimes = object.animations[0].tracks[0].times; // 假設每個track都是同一個長度
            for (let i = 0; i < frameTimes.length; i++) {
                mixer.setTime(frameTimes[i]);
                const hip = boneList.find(b => b.name === hipsName);
                if (hip) {
                    hipsPositionsRef.current[i] = hip.getWorldPosition(new THREE.Vector3());
                }
            }
            // 動畫循環
            animate({
                renderer, scene, camera, mixer,
                boneMeshes, jointSpheres,
                centerHipSphere: null, // FBX 不需要 centerHip
                chestSphere: null, // FBX 不需要 chest
                isPausedRef,
                speedRef,
                onProgerss: setProgress,
                onFrame: setFrameNumber,
                jointMapRef,
                selectedJointRef,
                comparedJointRef,
                hipsPositionsRef,
                frameRef,
                onSetCurrentFrameData: setCurrentFrameData,
            });

            resolve({
                object,
                boneList,
                boneMeshes,
                jointSpheres,
                mixer,
            });
        }, undefined, reject);
    });
}

export async function loadLandmarkAndInitSkeleton({
    landmarkUrl,
    scene,
    camera,
    renderer,
    setJoints,
    setSelectedJoint,
    setComparedJoint,
    jointMapRef,
    boneMeshes,
    jointSpheres,
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
}) {
    return new Promise((resolve, reject) => {
        fetch(landmarkUrl)
            .then(response => response.json())
            .then(landmarkData => {
                console.log('Landmark 數據加載完成', landmarkData);
                
                // 創建虛擬骨架結構
                const skeletonGroup = new THREE.Group();
                const bones = [];
                const boneMap = {};
                
                // 為每個關節點創建 Bone
                JOINT_NAMES.forEach((name, index) => {
                    const bone = new THREE.Bone();
                    bone.name = name;
                    bone.userData.index = index;
                    bones.push(bone);
                    boneMap[name] = bone;
                    jointMapRef.current[name] = bone;
                });
                
                // 建立骨架層次結構
                // 創建一個虛擬根節點作為整個骨架的根
                const rootBone = new THREE.Bone();
                rootBone.name = 'root';
                skeletonGroup.add(rootBone);
                
                // 將所有骨頭添加到場景中（先不建立父子關係）
                bones.forEach(bone => {
                    skeletonGroup.add(bone);
                });
                
                // 為了視覺化目的，我們不建立嚴格的父子骨骼關係
                // 而是讓所有骨頭都獨立存在，通過連線來表示關係
                
                scene.add(skeletonGroup);
                
                // 設置初始位置（使用第一幀數據）
                if (landmarkData.length > 0) {
                    const firstFrame = landmarkData[0];
                    updateBonePositions(bones, firstFrame.landmarks3D || firstFrame.landmarks2D);
                }
                
                // 設置關節列表
                setJoints(JOINT_NAMES);
                setSelectedJoint(JOINT_NAMES[1]); // left_shoulder (index 1 in your data)
                setComparedJoint(JOINT_NAMES[2]); // right_shoulder (index 2 in your data)
                
                // 創建視覺化
                createLandmarkBoneMeshes(bones, POSE_CONNECTIONS, boneMeshes, skeletonGroup);
                createLandmarkJointSpheres(bones, jointSpheres, skeletonGroup);
                
                // 創建 centerHip 可視化球體
                const centerHipSphere = createCenterHipSphere(skeletonGroup);
                
                // 創建 chest 可視化球體
                const chestSphere = createChestSphere(skeletonGroup);
                
                // 創建虛擬的 centerHip 骨骼並加入到 jointMapRef
                const centerHipBone = new THREE.Bone();
                centerHipBone.name = 'center_hip';
                // 創建虛擬的 chest 骨骼並加入到 jointMapRef
                const chestBone = new THREE.Bone();
                chestBone.name = 'chest';
                // 設置初始位置為 leftHip 和 rightHip 的中點
                if (landmarkData.length > 0) {
                    const firstFrame = landmarkData[0];
                    const landmarks = firstFrame.landmarks3D || firstFrame.landmarks2D;
                    const minHeelY = Math.max(landmarks[15].y, landmarks[16].y);
                    const yOffset = minHeelY * 100;
                    const leftHip = landmarks[7];
                    const rightHip = landmarks[8];
                    const leftShoulder = landmarks[1];
                    const rightShoulder = landmarks[2];
                    if (leftHip && rightHip) {
                        centerHipBone.position.set(
                            (leftHip.x + rightHip.x) / 2 * 100,
                            (-(leftHip.y + rightHip.y) / 2 * 100) + yOffset,
                            (leftHip.z + rightHip.z) / 2 * 100
                        );
                    }
                    if (leftShoulder && rightShoulder) {
                        chestBone.position.set(
                            (leftShoulder.x + rightShoulder.x) / 2 * 100,
                            (-(leftShoulder.y + rightShoulder.y) / 2 * 100) + yOffset,
                            (leftShoulder.z + rightShoulder.z) / 2 * 100
                        );
                    }
                }
                skeletonGroup.add(centerHipBone);
                skeletonGroup.add(chestBone);
                jointMapRef.current['center_hip'] = centerHipBone;
                jointMapRef.current['chest'] = chestBone;
                // 創建 nose 到 chest 的連線
                createNoseToChestConnection(bones[0], chestBone, boneMeshes, skeletonGroup);
                
                // 更新關節列表，加入 center_hip 和 chest
                const updatedJointNames = [...JOINT_NAMES, 'center_hip', 'chest'];
                setJoints(updatedJointNames);
                jointSpheres.push({
                    bone: centerHipBone,
                    sphere: centerHipSphere
                }, {
                    bone: chestBone,
                    sphere: chestSphere
                });
                // 點擊事件
                renderer.domElement.addEventListener('click', e => 
                    onClick(e, renderer, camera, skeletonGroup, jointSpheres, setAnnotations, frameRef)
                );
                
                // 創建自定義動畫系統
                const landmarkMixer = createLandmarkAnimationMixer(bones, landmarkData, centerHipBone, chestBone);
                mixerRef.current = landmarkMixer;
                setIsLandmarkLoaded(true);
                
                // 預計算 hip 位置用於重心分析
                landmarkData.forEach((frameData, frameIndex) => {
                    const landmarks = frameData.landmarks3D || frameData.landmarks2D;
                    const minHeelY = Math.max(landmarks[15].y, landmarks[16].y);
                    const yOffset = minHeelY * 100;
                    const leftHip = landmarks[7];  // left_hip (index 7 in your 15-point data)
                    const rightHip = landmarks[8]; // right_hip (index 8 in your 15-point data)
                    if (leftHip && rightHip) {
                        const centerHip = new THREE.Vector3(
                            (leftHip.x + rightHip.x) / 2 * 100, // 放大 + 平均
                            (-(leftHip.y + rightHip.y) / 2 * 100) + yOffset, // Y軸翻轉 + 放大 + 平均
                            (leftHip.z + rightHip.z) / 2 * 100  // 放大 + 平均
                        );
                        hipsPositionsRef.current[frameIndex] = centerHip;
                    }
                });
                
                // 啟動動畫循環
                animate({
                    renderer, scene, camera, 
                    mixer: landmarkMixer,
                    boneMeshes, jointSpheres,
                    centerHipSphere,
                    chestSphere,
                    isPausedRef, speedRef,
                    onProgerss: setProgress,
                    onFrame: setFrameNumber,
                    jointMapRef,
                    selectedJointRef,
                    comparedJointRef,
                    hipsPositionsRef,
                    frameRef,
                    onSetCurrentFrameData: setCurrentFrameData,
                });
                
                resolve({
                    skeletonGroup,
                    bones,
                    boneMeshes,
                    jointSpheres,
                    centerHipSphere,
                    chestSphere,
                    mixer: landmarkMixer,
                    landmarkData
                });
            })
            .catch(reject);
    });
}

function onClick(event, renderer, camera, object, jointSpheres, setAnnotations, frameRef) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(
        jointSpheres.map(j => j.sphere)
    );
    if (intersects.length > 0) {
        const sphere = intersects[0].object;
        const joint = jointSpheres.find(j => j.sphere === sphere);
        if (joint) {
            const text = window.prompt('請輸入註解：');
            if (text) {
                const info = {
                    frame: frameRef.current,
                    text
                }
                const sprite = makeTextSprite(`${frameRef.current} ${joint.bone.name}: ${text}`);
                sprite.position.copy(joint.bone.getWorldPosition(new THREE.Vector3()));
                sprite.position.y += 8; // 提高一些位置以避免與骨頭重疊
                object.add(sprite);
                const marker = new THREE.Mesh(
                    new THREE.SphereGeometry(1.5),
                    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
                );
                marker.position.copy(joint.bone.getWorldPosition(new THREE.Vector3()));
                object.add(marker);
                setAnnotations(prev => [
                    ...prev,
                    { bone: joint.bone, sprite, marker, info }
                ]);
            }
        }
    }
}

// 更新骨骼位置
function updateBonePositions(bones, landmarks) {
    // 找出腳跟的最低 Y 點作為地面參考
    let minHeelY = Math.max(landmarks[15].y, landmarks[16].y);
    
    // 計算 Y 軸偏移量，使最低的腳跟點對應到 Three.js 的 y=0（地面）
    const yOffset = minHeelY * 100;
    
    // 直接使用 MediaPipe 17 個關節點
    bones.forEach((bone, index) => {
        if (landmarks[index]) {
            const landmark = landmarks[index];
            bone.position.set(
                (landmark.x) * 100, // X軸：以 0.5 為中心，轉換為 Three.js 座標
                (-landmark.y * 100) + yOffset, // Y軸：翻轉並加上偏移量使腳跟貼地
                landmark.z * 100 // Z軸：保持原樣
            );
        }
    });
}

// 更新 centerHip 骨骼位置
function updateCenterHipBone(centerHipBone, landmarks, centerHipSphere = null) {
    const leftHip = landmarks[7];  // left_hip (index 7)
    const rightHip = landmarks[8]; // right_hip (index 8)
    
    if (leftHip && rightHip) {
        // 找出腳跟的最低 Y 點作為地面參考
        let minHeelY = Math.max(landmarks[15].y, landmarks[16].y);
        
        const yOffset = minHeelY * 100;
        
        const centerHipPosition = {
            x: ((leftHip.x + rightHip.x) / 2) * 100,
            y: (-(leftHip.y + rightHip.y) / 2 * 100) + yOffset,
            z: (leftHip.z + rightHip.z) / 2 * 100
        };
        
        // 更新 centerHipBone 位置
        centerHipBone.position.set(
            centerHipPosition.x,
            centerHipPosition.y,
            centerHipPosition.z
        );
    }
}

// 更新 chest 骨骼位置
function updateChestBone(chestBone, landmarks) {
    const leftShoulder = landmarks[1];  // left_shoulder (index 1)
    const rightShoulder = landmarks[2]; // right_shoulder (index 2)
    
    if (leftShoulder && rightShoulder) {
        // 找出腳跟的最低 Y 點作為地面參考
        let minHeelY = Math.max(landmarks[15].y, landmarks[16].y);
        // 計算 Y 軸偏移量，使最低的腳跟點對應到 Three.js 的 y=0（地面）
        const yOffset = minHeelY * 100;
        
        chestBone.position.set(
            ((leftShoulder.x + rightShoulder.x) / 2) * 100, // X軸：以 0.5 為中心
            (-(leftShoulder.y + rightShoulder.y) / 2 * 100) + yOffset, // Y軸：翻轉並加上偏移量
            (leftShoulder.z + rightShoulder.z) / 2 * 100  // Z軸：保持原樣
        );
    }
}

// 創建 Landmark 專用的動畫混合器
function createLandmarkAnimationMixer(bones, landmarkData, centerHipBone, chestBone) {
    let currentFrame = 0;
    const totalFrames = landmarkData.length;
    const fps = 30; // 假設 30fps
    
    return {
        _isLandmarkMixer: true,
        _bones: bones,
        _landmarkData: landmarkData,
        _centerHipBone: centerHipBone,
        _chestBone: chestBone,
        _currentFrame: currentFrame,
        _totalFrames: totalFrames,
        time: 0,
        
        update(deltaTime) {
            this.time += deltaTime;
            const targetFrame = Math.floor(this.time * fps) % totalFrames;
            
            if (targetFrame !== this._currentFrame) {
                this._currentFrame = targetFrame;
                const frameData = this._landmarkData[targetFrame];
                if (frameData) {
                    updateBonePositions(this._bones, frameData.landmarks3D || frameData.landmarks2D);
                    // 更新 centerHip 骨骼位置
                    if (this._centerHipBone) {
                        updateCenterHipBone(this._centerHipBone, frameData.landmarks3D || frameData.landmarks2D);
                    }
                    // 更新 chest 骨骼位置
                    if (this._chestBone) {
                        updateChestBone(this._chestBone, frameData.landmarks3D || frameData.landmarks2D);
                    }
                }
            }
        },
        
        setTime(time) {
            this.time = time;
            const targetFrame = Math.floor(time * fps) % totalFrames;
            this._currentFrame = targetFrame;
            const frameData = this._landmarkData[targetFrame];
            if (frameData) {
                updateBonePositions(this._bones, frameData.landmarks3D || frameData.landmarks2D);
                // 更新 centerHip 骨骼位置
                if (this._centerHipBone) {
                    updateCenterHipBone(this._centerHipBone, frameData.landmarks3D || frameData.landmarks2D);
                }
                // 更新 chest 骨骼位置
                if (this._chestBone) {
                    updateChestBone(this._chestBone, frameData.landmarks3D || frameData.landmarks2D);
                }
            }
        },
        
        // 相容原有 mixer API
        _actions: [{
            _clip: {
                duration: totalFrames / fps,
                tracks: [{ times: landmarkData.map((_, i) => i / fps) }]
            },
            time: 0
        }]
    };
}

// 創建 Landmark 專用骨骼網格
function createLandmarkBoneMeshes(bones, connections, boneMeshes, parent) {
    connections.forEach(([startIndex, endIndex], i) => {
        const startBone = bones[startIndex];
        const endBone = bones[endIndex];
        
        
        if (startBone && endBone) {
            const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
            const mesh = new THREE.Mesh(geometry, material);
            
            boneMeshes.push({ 
                bone: startBone, 
                endBone: endBone,
                mesh 
            });
            parent.add(mesh);
        } else {
            console.warn(`連接失敗: startBone=${!!startBone}, endBone=${!!endBone}`);
        }
    });
}

// 創建 Landmark 專用關節球體
function createLandmarkJointSpheres(bones, jointSpheres, parent) {
    bones.forEach(bone => {
        const geometry = new THREE.SphereGeometry(1.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const sphere = new THREE.Mesh(geometry, material);
        
        jointSpheres.push({ bone, sphere });
        parent.add(sphere);
    });
}

// 創建 centerHip 可視化球體
function createCenterHipSphere(parent) {
    const geometry = new THREE.SphereGeometry(2.5, 16, 16); // 比普通關節稍大
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x0000ff,
        transparent: true,
        opacity: 0.8
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = 'centerHip';
    parent.add(sphere);
    return sphere;
}

// 創建 chest 可視化球體
function createChestSphere(parent) {
    const geometry = new THREE.SphereGeometry(2.5, 16, 16); // 比普通關節稍大
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, // 青色以區別於其他關節
        transparent: true,
        opacity: 0.8
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = 'chest';
    parent.add(sphere);
    return sphere;
}

// 創建 nose 到 chest 的連線
function createNoseToChestConnection(noseBone, chestBone, boneMeshes, parent) {
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff88 }); // 橙色以區別於其他連線
    const mesh = new THREE.Mesh(geometry, material);
    
    boneMeshes.push({ 
        bone: noseBone, 
        endBone: chestBone,
        mesh 
    });
    parent.add(mesh);
}