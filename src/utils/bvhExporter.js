/**
 * BVH (Biovision Hierarchy) 匯出工具
 * 用於將三維動作捕捉數據轉換為 BVH 格式
 */

export class BVHExporter {
    constructor() {
        // MediaPipe 姿態關鍵點到 BVH 骨架的映射
        this.mediapipeToSkeleton = {
            // 軀幹
            0: 'nose',
            1: 'left_eye_inner',
            2: 'left_eye',
            3: 'left_eye_outer',
            4: 'right_eye_inner',
            5: 'right_eye',
            6: 'right_eye_outer',
            7: 'left_ear',
            8: 'right_ear',
            9: 'mouth_left',
            10: 'mouth_right',
            11: 'left_shoulder',
            12: 'right_shoulder',
            13: 'left_elbow',
            14: 'right_elbow',
            15: 'left_wrist',
            16: 'right_wrist',
            17: 'left_pinky',
            18: 'right_pinky',
            19: 'left_index',
            20: 'right_index',
            21: 'left_thumb',
            22: 'right_thumb',
            23: 'left_hip',
            24: 'right_hip',
            25: 'left_knee',
            26: 'right_knee',
            27: 'left_ankle',
            28: 'right_ankle',
            29: 'left_heel',
            30: 'right_heel',
            31: 'left_foot_index',
            32: 'right_foot_index'
        };

        // BVH 骨架結構定義
        this.skeletonHierarchy = {
            'Hips': {
                parent: null,
                children: ['Spine', 'LeftUpLeg', 'RightUpLeg'],
                channels: 6, // Xposition Yposition Zposition Zrotation Xrotation Yrotation
                mediapipeJoints: [23, 24] // 左右髖關節
            },
            'Spine': {
                parent: 'Hips',
                children: ['Spine1'],
                channels: 3, // Zrotation Xrotation Yrotation
                mediapipeJoints: [11, 12] // 左右肩膀中點
            },
            'Spine1': {
                parent: 'Spine',
                children: ['Neck'],
                channels: 3,
                mediapipeJoints: [11, 12]
            },
            'Neck': {
                parent: 'Spine1',
                children: ['Head', 'LeftShoulder', 'RightShoulder'],
                channels: 3,
                mediapipeJoints: [0] // 鼻子
            },
            'Head': {
                parent: 'Neck',
                children: [],
                channels: 3,
                mediapipeJoints: [0]
            },
            'LeftShoulder': {
                parent: 'Neck',
                children: ['LeftArm'],
                channels: 3,
                mediapipeJoints: [11]
            },
            'LeftArm': {
                parent: 'LeftShoulder',
                children: ['LeftForeArm'],
                channels: 3,
                mediapipeJoints: [11, 13]
            },
            'LeftForeArm': {
                parent: 'LeftArm',
                children: ['LeftHand'],
                channels: 3,
                mediapipeJoints: [13, 15]
            },
            'LeftHand': {
                parent: 'LeftForeArm',
                children: [],
                channels: 3,
                mediapipeJoints: [15]
            },
            'RightShoulder': {
                parent: 'Neck',
                children: ['RightArm'],
                channels: 3,
                mediapipeJoints: [12]
            },
            'RightArm': {
                parent: 'RightShoulder',
                children: ['RightForeArm'],
                channels: 3,
                mediapipeJoints: [12, 14]
            },
            'RightForeArm': {
                parent: 'RightArm',
                children: ['RightHand'],
                channels: 3,
                mediapipeJoints: [14, 16]
            },
            'RightHand': {
                parent: 'RightForeArm',
                children: [],
                channels: 3,
                mediapipeJoints: [16]
            },
            'LeftUpLeg': {
                parent: 'Hips',
                children: ['LeftLeg'],
                channels: 3,
                mediapipeJoints: [23, 25]
            },
            'LeftLeg': {
                parent: 'LeftUpLeg',
                children: ['LeftFoot'],
                channels: 3,
                mediapipeJoints: [25, 27]
            },
            'LeftFoot': {
                parent: 'LeftLeg',
                children: [],
                channels: 3,
                mediapipeJoints: [27]
            },
            'RightUpLeg': {
                parent: 'Hips',
                children: ['RightLeg'],
                channels: 3,
                mediapipeJoints: [24, 26]
            },
            'RightLeg': {
                parent: 'RightUpLeg',
                children: ['RightFoot'],
                channels: 3,
                mediapipeJoints: [26, 28]
            },
            'RightFoot': {
                parent: 'RightLeg',
                children: [],
                channels: 3,
                mediapipeJoints: [28]
            }
        };
    }

    /**
     * 匯出動作數據為 BVH 格式
     * @param {Array} motionData - 動作捕捉數據
     * @param {Object} options - 匯出選項
     * @returns {string} BVH 格式的字符串
     */
    async exportMotionData(motionData, options = {}) {
        const {
            fps = 30,
            skeletonType = 'mediapipe',
            quality = 'high',
            scale = 100 // 縮放比例 (mm to cm)
        } = options;

        if (!motionData || motionData.length === 0) {
            throw new Error('沒有可匯出的動作數據');
        }

        // 生成 BVH 標頭
        const header = this.generateBVHHeader(fps, scale);
        
        // 生成動作數據
        const motion = this.generateMotionData(motionData, fps, scale);

        return header + motion;
    }

    /**
     * 生成 BVH 標頭
     * @param {number} fps - 幀率
     * @param {number} scale - 縮放比例
     * @returns {string} BVH 標頭字符串
     */
    generateBVHHeader(fps, scale) {
        let header = 'HIERARCHY\n';
        
        // 生成骨架結構
        header += this.generateSkeletonStructure('Hips', 0);
        
        // 生成動作部分標頭
        header += 'MOTION\n';
        
        return header;
    }

    /**
     * 生成骨架結構
     * @param {string} jointName - 關節名稱
     * @param {number} depth - 縮排深度
     * @returns {string} 骨架結構字符串
     */
    generateSkeletonStructure(jointName, depth) {
        const indent = '  '.repeat(depth);
        const joint = this.skeletonHierarchy[jointName];
        
        if (!joint) return '';

        let structure = '';
        
        // 根節點使用 ROOT，其他使用 JOINT
        if (depth === 0) {
            structure += `${indent}ROOT ${jointName}\n`;
        } else {
            structure += `${indent}JOINT ${jointName}\n`;
        }
        
        structure += `${indent}{\n`;
        
        // 偏移量 (根據標準人體比例)
        const offset = this.calculateJointOffset(jointName);
        structure += `${indent}  OFFSET ${offset.x.toFixed(6)} ${offset.y.toFixed(6)} ${offset.z.toFixed(6)}\n`;
        
        // 通道定義
        const channels = this.getChannelDefinition(jointName);
        structure += `${indent}  CHANNELS ${channels.count} ${channels.types.join(' ')}\n`;
        
        // 子關節
        for (const childName of joint.children) {
            structure += this.generateSkeletonStructure(childName, depth + 1);
        }
        
        structure += `${indent}}\n`;
        
        return structure;
    }

    /**
     * 計算關節偏移量
     * @param {string} jointName - 關節名稱
     * @returns {Object} 偏移量座標 {x, y, z}
     */
    calculateJointOffset(jointName) {
        // 基於標準人體比例的偏移量 (單位: cm)
        const offsets = {
            'Hips': { x: 0, y: 0, z: 0 },
            'Spine': { x: 0, y: 10, z: 0 },
            'Spine1': { x: 0, y: 15, z: 0 },
            'Neck': { x: 0, y: 20, z: 0 },
            'Head': { x: 0, y: 15, z: 0 },
            'LeftShoulder': { x: 15, y: 0, z: 0 },
            'LeftArm': { x: 0, y: -25, z: 0 },
            'LeftForeArm': { x: 0, y: -25, z: 0 },
            'LeftHand': { x: 0, y: -15, z: 0 },
            'RightShoulder': { x: -15, y: 0, z: 0 },
            'RightArm': { x: 0, y: -25, z: 0 },
            'RightForeArm': { x: 0, y: -25, z: 0 },
            'RightHand': { x: 0, y: -15, z: 0 },
            'LeftUpLeg': { x: 10, y: 0, z: 0 },
            'LeftLeg': { x: 0, y: -40, z: 0 },
            'LeftFoot': { x: 0, y: -40, z: 0 },
            'RightUpLeg': { x: -10, y: 0, z: 0 },
            'RightLeg': { x: 0, y: -40, z: 0 },
            'RightFoot': { x: 0, y: -40, z: 0 }
        };

        return offsets[jointName] || { x: 0, y: 0, z: 0 };
    }

    /**
     * 獲取通道定義
     * @param {string} jointName - 關節名稱
     * @returns {Object} 通道定義 {count, types}
     */
    getChannelDefinition(jointName) {
        const joint = this.skeletonHierarchy[jointName];
        
        if (jointName === 'Hips') {
            return {
                count: 6,
                types: ['Xposition', 'Yposition', 'Zposition', 'Zrotation', 'Xrotation', 'Yrotation']
            };
        } else {
            return {
                count: 3,
                types: ['Zrotation', 'Xrotation', 'Yrotation']
            };
        }
    }

    /**
     * 生成動作數據
     * @param {Array} motionData - 動作捕捉數據
     * @param {number} fps - 幀率
     * @param {number} scale - 縮放比例
     * @returns {string} 動作數據字符串
     */
    generateMotionData(motionData, fps, scale) {
        const frameTime = 1.0 / fps;
        let motion = `Frames: ${motionData.length}\n`;
        motion += `Frame Time: ${frameTime.toFixed(6)}\n`;

        for (const frameData of motionData) {
            const frameValues = this.calculateFrameValues(frameData, scale);
            motion += frameValues.join(' ') + '\n';
        }

        return motion;
    }

    /**
     * 計算幀數據值
     * @param {Object} frameData - 幀數據
     * @param {number} scale - 縮放比例
     * @returns {Array} 幀值數組
     */
    calculateFrameValues(frameData, scale) {
        const values = [];
        const points3D = frameData.points3D || [];
        
        // 如果沒有三維數據，使用默認值
        if (points3D.length === 0) {
            // 根據骨架結構計算所需的值數量
            const totalChannels = this.calculateTotalChannels();
            return new Array(totalChannels).fill(0);
        }

        // 計算根位置 (髖關節)
        const hipPosition = this.calculateHipPosition(points3D, scale);
        values.push(hipPosition.x, hipPosition.y, hipPosition.z);

        // 計算所有關節的旋轉角度
        for (const jointName in this.skeletonHierarchy) {
            const joint = this.skeletonHierarchy[jointName];
            const rotation = this.calculateJointRotation(jointName, points3D);
            
            if (jointName === 'Hips') {
                // 髖關節已經有位置，只需要旋轉
                values.push(rotation.z, rotation.x, rotation.y);
            } else {
                values.push(rotation.z, rotation.x, rotation.y);
            }
        }

        return values;
    }

    /**
     * 計算髖關節位置
     * @param {Array} points3D - 三維點
     * @param {number} scale - 縮放比例
     * @returns {Object} 髖關節位置 {x, y, z}
     */
    calculateHipPosition(points3D, scale) {
        // 找到左右髖關節
        const leftHip = points3D.find(p => p.keypointIndex === 23);
        const rightHip = points3D.find(p => p.keypointIndex === 24);

        if (leftHip && rightHip) {
            return {
                x: (leftHip.x + rightHip.x) / 2 / scale,
                y: (leftHip.y + rightHip.y) / 2 / scale,
                z: (leftHip.z + rightHip.z) / 2 / scale
            };
        }

        return { x: 0, y: 0, z: 0 };
    }

    /**
     * 計算關節旋轉角度
     * @param {string} jointName - 關節名稱
     * @param {Array} points3D - 三維點
     * @returns {Object} 旋轉角度 {x, y, z} (度)
     */
    calculateJointRotation(jointName, points3D) {
        const joint = this.skeletonHierarchy[jointName];
        const mediapipeJoints = joint.mediapipeJoints || [];

        if (mediapipeJoints.length === 0) {
            return { x: 0, y: 0, z: 0 };
        }

        // 根據關節類型計算旋轉
        switch (jointName) {
            case 'LeftArm':
            case 'RightArm':
                return this.calculateArmRotation(jointName, points3D);
            case 'LeftForeArm':
            case 'RightForeArm':
                return this.calculateForearmRotation(jointName, points3D);
            case 'LeftUpLeg':
            case 'RightUpLeg':
                return this.calculateThighRotation(jointName, points3D);
            case 'LeftLeg':
            case 'RightLeg':
                return this.calculateCalfRotation(jointName, points3D);
            default:
                return { x: 0, y: 0, z: 0 };
        }
    }

    /**
     * 計算手臂旋轉
     * @param {string} jointName - 關節名稱
     * @param {Array} points3D - 三維點
     * @returns {Object} 旋轉角度
     */
    calculateArmRotation(jointName, points3D) {
        const isLeft = jointName.includes('Left');
        const shoulderIndex = isLeft ? 11 : 12;
        const elbowIndex = isLeft ? 13 : 14;

        const shoulder = points3D.find(p => p.keypointIndex === shoulderIndex);
        const elbow = points3D.find(p => p.keypointIndex === elbowIndex);

        if (!shoulder || !elbow) {
            return { x: 0, y: 0, z: 0 };
        }

        // 計算肩膀到肘部的向量
        const armVector = {
            x: elbow.x - shoulder.x,
            y: elbow.y - shoulder.y,
            z: elbow.z - shoulder.z
        };

        // 轉換為旋轉角度
        const angleY = Math.atan2(armVector.x, armVector.z) * 180 / Math.PI;
        const angleX = Math.atan2(armVector.y, 
            Math.sqrt(armVector.x * armVector.x + armVector.z * armVector.z)) * 180 / Math.PI;

        return { x: angleX, y: angleY, z: 0 };
    }

    /**
     * 計算前臂旋轉
     * @param {string} jointName - 關節名稱
     * @param {Array} points3D - 三維點
     * @returns {Object} 旋轉角度
     */
    calculateForearmRotation(jointName, points3D) {
        const isLeft = jointName.includes('Left');
        const elbowIndex = isLeft ? 13 : 14;
        const wristIndex = isLeft ? 15 : 16;

        const elbow = points3D.find(p => p.keypointIndex === elbowIndex);
        const wrist = points3D.find(p => p.keypointIndex === wristIndex);

        if (!elbow || !wrist) {
            return { x: 0, y: 0, z: 0 };
        }

        // 計算肘部到手腕的向量
        const forearmVector = {
            x: wrist.x - elbow.x,
            y: wrist.y - elbow.y,
            z: wrist.z - elbow.z
        };

        // 轉換為旋轉角度
        const angleY = Math.atan2(forearmVector.x, forearmVector.z) * 180 / Math.PI;
        const angleX = Math.atan2(forearmVector.y, 
            Math.sqrt(forearmVector.x * forearmVector.x + forearmVector.z * forearmVector.z)) * 180 / Math.PI;

        return { x: angleX, y: angleY, z: 0 };
    }

    /**
     * 計算大腿旋轉
     * @param {string} jointName - 關節名稱
     * @param {Array} points3D - 三維點
     * @returns {Object} 旋轉角度
     */
    calculateThighRotation(jointName, points3D) {
        const isLeft = jointName.includes('Left');
        const hipIndex = isLeft ? 23 : 24;
        const kneeIndex = isLeft ? 25 : 26;

        const hip = points3D.find(p => p.keypointIndex === hipIndex);
        const knee = points3D.find(p => p.keypointIndex === kneeIndex);

        if (!hip || !knee) {
            return { x: 0, y: 0, z: 0 };
        }

        // 計算髖關節到膝蓋的向量
        const thighVector = {
            x: knee.x - hip.x,
            y: knee.y - hip.y,
            z: knee.z - hip.z
        };

        // 轉換為旋轉角度
        const angleY = Math.atan2(thighVector.x, thighVector.z) * 180 / Math.PI;
        const angleX = Math.atan2(thighVector.y, 
            Math.sqrt(thighVector.x * thighVector.x + thighVector.z * thighVector.z)) * 180 / Math.PI;

        return { x: angleX, y: angleY, z: 0 };
    }

    /**
     * 計算小腿旋轉
     * @param {string} jointName - 關節名稱
     * @param {Array} points3D - 三維點
     * @returns {Object} 旋轉角度
     */
    calculateCalfRotation(jointName, points3D) {
        const isLeft = jointName.includes('Left');
        const kneeIndex = isLeft ? 25 : 26;
        const ankleIndex = isLeft ? 27 : 28;

        const knee = points3D.find(p => p.keypointIndex === kneeIndex);
        const ankle = points3D.find(p => p.keypointIndex === ankleIndex);

        if (!knee || !ankle) {
            return { x: 0, y: 0, z: 0 };
        }

        // 計算膝蓋到踝關節的向量
        const calfVector = {
            x: ankle.x - knee.x,
            y: ankle.y - knee.y,
            z: ankle.z - knee.z
        };

        // 轉換為旋轉角度
        const angleY = Math.atan2(calfVector.x, calfVector.z) * 180 / Math.PI;
        const angleX = Math.atan2(calfVector.y, 
            Math.sqrt(calfVector.x * calfVector.x + calfVector.z * calfVector.z)) * 180 / Math.PI;

        return { x: angleX, y: angleY, z: 0 };
    }

    /**
     * 計算總通道數
     * @returns {number} 總通道數
     */
    calculateTotalChannels() {
        let totalChannels = 0;
        for (const jointName in this.skeletonHierarchy) {
            const joint = this.skeletonHierarchy[jointName];
            totalChannels += joint.channels;
        }
        return totalChannels;
    }

    /**
     * 驗證 BVH 數據格式
     * @param {string} bvhData - BVH 數據
     * @returns {boolean} 是否有效
     */
    validateBVHData(bvhData) {
        try {
            const lines = bvhData.split('\n');
            
            // 檢查是否有 HIERARCHY 和 MOTION 標記
            const hasHierarchy = lines.some(line => line.trim() === 'HIERARCHY');
            const hasMotion = lines.some(line => line.trim() === 'MOTION');
            
            if (!hasHierarchy || !hasMotion) {
                return false;
            }

            // 檢查是否有 ROOT 關節
            const hasRoot = lines.some(line => line.trim().startsWith('ROOT'));
            
            return hasRoot;
        } catch (error) {
            console.error('BVH 驗證失敗:', error);
            return false;
        }
    }
}

export default BVHExporter;
