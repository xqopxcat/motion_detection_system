/**
 * FBX (Filmbox) 匯出工具
 * 用於將三維動作捕捉數據轉換為 FBX 格式
 * 注意：這是一個簡化版本，實際 FBX 格式非常複雜
 */

export class FBXExporter {
    constructor() {
        this.version = '7.7.0';
        this.objectId = 1000000; // FBX 物件 ID 起始值
        
        // MediaPipe 到 FBX 骨架的映射
        this.mediapipeToFBXBones = {
            // 核心骨架
            'Hips': { indices: [23, 24], parent: null },
            'Spine': { indices: [11, 12], parent: 'Hips' },
            'Spine1': { indices: [11, 12], parent: 'Spine' },
            'Neck': { indices: [0], parent: 'Spine1' },
            'Head': { indices: [0], parent: 'Neck' },
            
            // 左臂
            'LeftShoulder': { indices: [11], parent: 'Spine1' },
            'LeftArm': { indices: [11, 13], parent: 'LeftShoulder' },
            'LeftForeArm': { indices: [13, 15], parent: 'LeftArm' },
            'LeftHand': { indices: [15], parent: 'LeftForeArm' },
            
            // 右臂
            'RightShoulder': { indices: [12], parent: 'Spine1' },
            'RightArm': { indices: [12, 14], parent: 'RightShoulder' },
            'RightForeArm': { indices: [14, 16], parent: 'RightArm' },
            'RightHand': { indices: [16], parent: 'RightForeArm' },
            
            // 左腿
            'LeftUpLeg': { indices: [23, 25], parent: 'Hips' },
            'LeftLeg': { indices: [25, 27], parent: 'LeftUpLeg' },
            'LeftFoot': { indices: [27], parent: 'LeftLeg' },
            
            // 右腿
            'RightUpLeg': { indices: [24, 26], parent: 'Hips' },
            'RightLeg': { indices: [26, 28], parent: 'RightUpLeg' },
            'RightFoot': { indices: [28], parent: 'RightLeg' }
        };

        // 標準骨架長度 (cm)
        this.standardBoneLengths = {
            'Hips': 0,
            'Spine': 15,
            'Spine1': 15,
            'Neck': 10,
            'Head': 15,
            'LeftShoulder': 15,
            'LeftArm': 25,
            'LeftForeArm': 25,
            'LeftHand': 15,
            'RightShoulder': 15,
            'RightArm': 25,
            'RightForeArm': 25,
            'RightHand': 15,
            'LeftUpLeg': 40,
            'LeftLeg': 40,
            'LeftFoot': 15,
            'RightUpLeg': 40,
            'RightLeg': 40,
            'RightFoot': 15
        };
    }

    /**
     * 匯出動作數據為 FBX 格式
     * @param {Array} motionData - 動作捕捉數據
     * @param {Object} options - 匯出選項
     * @returns {ArrayBuffer} FBX 格式的二進制數據
     */
    async exportMotionData(motionData, options = {}) {
        const {
            fps = 30,
            skeletonType = 'mediapipe',
            quality = 'high',
            scale = 1.0 // 縮放比例
        } = options;

        if (!motionData || motionData.length === 0) {
            throw new Error('沒有可匯出的動作數據');
        }

        try {
            // 生成 FBX 文檔結構
            const fbxDocument = this.createFBXDocument(motionData, fps, scale);
            
            // 轉換為二進制格式
            const binaryData = this.convertToBinary(fbxDocument);
            
            return binaryData;
        } catch (error) {
            console.error('FBX 匯出失敗:', error);
            throw new Error('FBX 匯出失敗: ' + error.message);
        }
    }

    /**
     * 創建 FBX 文檔結構
     * @param {Array} motionData - 動作數據
     * @param {number} fps - 幀率
     * @param {number} scale - 縮放比例
     * @returns {Object} FBX 文檔物件
     */
    createFBXDocument(motionData, fps, scale) {
        const document = {
            FBXHeaderExtension: this.createHeaderExtension(),
            GlobalSettings: this.createGlobalSettings(fps),
            Objects: this.createObjects(motionData, scale),
            Connections: this.createConnections(),
            Takes: this.createTakes(motionData, fps)
        };

        return document;
    }

    /**
     * 創建 FBX 標頭擴展
     * @returns {Object} 標頭擴展物件
     */
    createHeaderExtension() {
        return {
            FBXHeaderVersion: 1003,
            FBXVersion: 7700,
            CreationTimeStamp: {
                Version: 1000,
                Year: new Date().getFullYear(),
                Month: new Date().getMonth() + 1,
                Day: new Date().getDate(),
                Hour: new Date().getHours(),
                Minute: new Date().getMinutes(),
                Second: new Date().getSeconds(),
                Millisecond: new Date().getMilliseconds()
            },
            Creator: "MediaPipe Motion Capture Studio",
            SceneInfo: {
                Type: "UserData",
                Version: 100,
                MetaData: {
                    Version: 100,
                    Title: "Motion Capture Animation",
                    Subject: "3D Motion Capture from Dual Camera System",
                    Author: "MediaPipe Motion Capture Studio",
                    Keywords: "motion capture, animation, mediapipe",
                    Revision: "1.0",
                    Comment: "Generated from dual camera 3D motion capture data"
                }
            }
        };
    }

    /**
     * 創建全域設定
     * @param {number} fps - 幀率
     * @returns {Object} 全域設定物件
     */
    createGlobalSettings(fps) {
        return {
            Version: 1000,
            Properties70: {
                "UpAxis": { type: "int", value: 1 }, // Y-up
                "UpAxisSign": { type: "int", value: 1 },
                "FrontAxis": { type: "int", value: 2 }, // Z-front
                "FrontAxisSign": { type: "int", value: 1 },
                "CoordAxis": { type: "int", value: 0 }, // X-right
                "CoordAxisSign": { type: "int", value: 1 },
                "OriginalUpAxis": { type: "int", value: 1 },
                "OriginalUpAxisSign": { type: "int", value: 1 },
                "UnitScaleFactor": { type: "double", value: 1.0 },
                "OriginalUnitScaleFactor": { type: "double", value: 1.0 },
                "DefaultCamera": { type: "KString", value: "Producer Perspective" },
                "TimeMode": { type: "enum", value: this.getFBXTimeMode(fps) },
                "TimeProtocol": { type: "enum", value: 2 },
                "SnapOnFrameMode": { type: "enum", value: 0 },
                "TimeSpanStart": { type: "KTime", value: 0 },
                "TimeSpanStop": { type: "KTime", value: 46186158000 }, // 1 秒 @ 30fps
                "CustomFrameRate": { type: "double", value: fps }
            }
        };
    }

    /**
     * 獲取 FBX 時間模式
     * @param {number} fps - 幀率
     * @returns {number} FBX 時間模式
     */
    getFBXTimeMode(fps) {
        const modes = {
            24: 33,
            25: 32,
            30: 31,
            60: 35
        };
        return modes[fps] || 31; // 預設 30fps
    }

    /**
     * 創建物件
     * @param {Array} motionData - 動作數據
     * @param {number} scale - 縮放比例
     * @returns {Object} 物件集合
     */
    createObjects(motionData, scale) {
        const objects = {};

        // 創建模型物件
        const modelId = this.generateObjectId();
        objects[modelId] = this.createModel(modelId);

        // 創建骨架
        for (const boneName in this.mediapipeToFBXBones) {
            const boneId = this.generateObjectId();
            objects[boneId] = this.createBone(boneId, boneName, scale);
        }

        // 創建動畫層
        const animLayerId = this.generateObjectId();
        objects[animLayerId] = this.createAnimationLayer(animLayerId);

        // 創建動畫曲線
        for (const boneName in this.mediapipeToFBXBones) {
            const curves = this.createAnimationCurves(boneName, motionData, scale);
            Object.assign(objects, curves);
        }

        return objects;
    }

    /**
     * 創建模型物件
     * @param {number} modelId - 模型 ID
     * @returns {Object} 模型物件
     */
    createModel(modelId) {
        return {
            id: modelId,
            class: "Model",
            subclass: "Mesh",
            name: "MotionCaptureCharacter",
            properties: {
                Version: 232,
                ShadingMode: "Y",
                MultiLayer: 0,
                MultiTake: 0,
                Shading: true,
                Culling: "CullingOff"
            },
            propertyTemplate: "FbxMesh"
        };
    }

    /**
     * 創建骨骼物件
     * @param {number} boneId - 骨骼 ID
     * @param {string} boneName - 骨骼名稱
     * @param {number} scale - 縮放比例
     * @returns {Object} 骨骼物件
     */
    createBone(boneId, boneName, scale) {
        const boneLength = this.standardBoneLengths[boneName] * scale;
        
        return {
            id: boneId,
            class: "NodeAttribute",
            subclass: "LimbNode",
            name: boneName,
            properties: {
                TypeFlags: "Skeleton",
                Size: boneLength
            },
            Properties70: {
                "Size": { type: "double", value: boneLength }
            }
        };
    }

    /**
     * 創建動畫層
     * @param {number} layerId - 層 ID
     * @returns {Object} 動畫層物件
     */
    createAnimationLayer(layerId) {
        return {
            id: layerId,
            class: "AnimationLayer",
            subclass: "",
            name: "BaseLayer",
            properties: {
                Weight: 100,
                Mute: false,
                Solo: false,
                Lock: false,
                Color: [0.8, 0.8, 0.8],
                BlendMode: 0,
                RotationAccumulationMode: 0,
                ScaleAccumulationMode: 1
            }
        };
    }

    /**
     * 創建動畫曲線
     * @param {string} boneName - 骨骼名稱
     * @param {Array} motionData - 動作數據
     * @param {number} scale - 縮放比例
     * @returns {Object} 動畫曲線物件集合
     */
    createAnimationCurves(boneName, motionData, scale) {
        const curves = {};
        const boneInfo = this.mediapipeToFBXBones[boneName];
        
        if (!boneInfo) return curves;

        // 為每個變換通道創建曲線 (Translation X, Y, Z, Rotation X, Y, Z)
        const channels = ['TX', 'TY', 'TZ', 'RX', 'RY', 'RZ'];
        
        for (const channel of channels) {
            const curveId = this.generateObjectId();
            curves[curveId] = this.createAnimationCurve(
                curveId, 
                boneName, 
                channel, 
                motionData, 
                boneInfo, 
                scale
            );
        }

        return curves;
    }

    /**
     * 創建單個動畫曲線
     * @param {number} curveId - 曲線 ID
     * @param {string} boneName - 骨骼名稱
     * @param {string} channel - 通道名稱
     * @param {Array} motionData - 動作數據
     * @param {Object} boneInfo - 骨骼信息
     * @param {number} scale - 縮放比例
     * @returns {Object} 動畫曲線物件
     */
    createAnimationCurve(curveId, boneName, channel, motionData, boneInfo, scale) {
        const keyframes = this.generateKeyframes(boneName, channel, motionData, boneInfo, scale);
        
        return {
            id: curveId,
            class: "AnimationCurve",
            subclass: "",
            name: `${boneName}_${channel}`,
            properties: {
                Default: 0.0,
                KeyVer: 4008,
                KeyTime: keyframes.times,
                KeyValueFloat: keyframes.values,
                KeyAttrFlags: keyframes.flags,
                KeyAttrDataFloat: keyframes.tangents,
                KeyAttrRefCount: keyframes.refCounts
            }
        };
    }

    /**
     * 生成關鍵幀數據
     * @param {string} boneName - 骨骼名稱
     * @param {string} channel - 通道名稱
     * @param {Array} motionData - 動作數據
     * @param {Object} boneInfo - 骨骼信息
     * @param {number} scale - 縮放比例
     * @returns {Object} 關鍵幀數據
     */
    generateKeyframes(boneName, channel, motionData, boneInfo, scale) {
        const times = [];
        const values = [];
        const flags = [];
        const tangents = [];
        const refCounts = [];

        for (let i = 0; i < motionData.length; i++) {
            const frameData = motionData[i];
            const frameTime = i * (46186158000 / 30); // FBX 時間單位

            // 計算該幀的骨骼變換
            const transform = this.calculateBoneTransform(boneName, frameData, boneInfo, scale);
            
            let value = 0;
            switch (channel) {
                case 'TX': value = transform.translation.x; break;
                case 'TY': value = transform.translation.y; break;
                case 'TZ': value = transform.translation.z; break;
                case 'RX': value = transform.rotation.x; break;
                case 'RY': value = transform.rotation.y; break;
                case 'RZ': value = transform.rotation.z; break;
            }

            times.push(frameTime);
            values.push(value);
            flags.push(8196); // 標準關鍵幀標誌
            tangents.push(0, 0, 0, 0); // 切線數據
            refCounts.push(1);
        }

        return { times, values, flags, tangents, refCounts };
    }

    /**
     * 計算骨骼變換
     * @param {string} boneName - 骨骼名稱
     * @param {Object} frameData - 幀數據
     * @param {Object} boneInfo - 骨骼信息
     * @param {number} scale - 縮放比例
     * @returns {Object} 變換數據 {translation, rotation}
     */
    calculateBoneTransform(boneName, frameData, boneInfo, scale) {
        const points3D = frameData.points3D || [];
        
        // 預設變換
        let transform = {
            translation: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 }
        };

        if (points3D.length === 0) return transform;

        // 根據骨骼類型計算變換
        if (boneName === 'Hips') {
            transform = this.calculateHipsTransform(points3D, scale);
        } else if (boneName.includes('Arm') || boneName.includes('ForeArm')) {
            transform = this.calculateArmTransform(boneName, points3D, scale);
        } else if (boneName.includes('Leg') || boneName.includes('UpLeg')) {
            transform = this.calculateLegTransform(boneName, points3D, scale);
        }

        return transform;
    }

    /**
     * 計算髖關節變換
     * @param {Array} points3D - 三維點
     * @param {number} scale - 縮放比例
     * @returns {Object} 變換數據
     */
    calculateHipsTransform(points3D, scale) {
        const leftHip = points3D.find(p => p.keypointIndex === 23);
        const rightHip = points3D.find(p => p.keypointIndex === 24);

        if (!leftHip || !rightHip) {
            return { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
        }

        // 計算髖關節中心位置
        const translation = {
            x: (leftHip.x + rightHip.x) / 2 * scale,
            y: (leftHip.y + rightHip.y) / 2 * scale,
            z: (leftHip.z + rightHip.z) / 2 * scale
        };

        // 計算髖關節旋轉（基於髖關節方向）
        const hipVector = {
            x: rightHip.x - leftHip.x,
            y: rightHip.y - leftHip.y,
            z: rightHip.z - leftHip.z
        };

        const rotation = {
            x: 0,
            y: Math.atan2(hipVector.x, hipVector.z) * 180 / Math.PI,
            z: Math.atan2(hipVector.y, Math.sqrt(hipVector.x * hipVector.x + hipVector.z * hipVector.z)) * 180 / Math.PI
        };

        return { translation, rotation };
    }

    /**
     * 計算手臂變換
     * @param {string} boneName - 骨骼名稱
     * @param {Array} points3D - 三維點
     * @param {number} scale - 縮放比例
     * @returns {Object} 變換數據
     */
    calculateArmTransform(boneName, points3D, scale) {
        // 根據骨骼名稱確定關節索引
        const isLeft = boneName.includes('Left');
        let startIndex, endIndex;

        if (boneName.includes('Arm') && !boneName.includes('ForeArm')) {
            // 上臂
            startIndex = isLeft ? 11 : 12; // 肩膀
            endIndex = isLeft ? 13 : 14;   // 肘部
        } else if (boneName.includes('ForeArm')) {
            // 前臂
            startIndex = isLeft ? 13 : 14; // 肘部
            endIndex = isLeft ? 15 : 16;   // 手腕
        }

        const startJoint = points3D.find(p => p.keypointIndex === startIndex);
        const endJoint = points3D.find(p => p.keypointIndex === endIndex);

        if (!startJoint || !endJoint) {
            return { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
        }

        // 計算骨骼向量
        const boneVector = {
            x: endJoint.x - startJoint.x,
            y: endJoint.y - startJoint.y,
            z: endJoint.z - startJoint.z
        };

        // 計算旋轉角度
        const rotation = {
            x: Math.atan2(boneVector.y, Math.sqrt(boneVector.x * boneVector.x + boneVector.z * boneVector.z)) * 180 / Math.PI,
            y: Math.atan2(boneVector.x, boneVector.z) * 180 / Math.PI,
            z: 0
        };

        return { 
            translation: { x: 0, y: 0, z: 0 }, // 相對於父骨骼
            rotation 
        };
    }

    /**
     * 計算腿部變換
     * @param {string} boneName - 骨骼名稱
     * @param {Array} points3D - 三維點
     * @param {number} scale - 縮放比例
     * @returns {Object} 變換數據
     */
    calculateLegTransform(boneName, points3D, scale) {
        // 根據骨骼名稱確定關節索引
        const isLeft = boneName.includes('Left');
        let startIndex, endIndex;

        if (boneName.includes('UpLeg')) {
            // 大腿
            startIndex = isLeft ? 23 : 24; // 髖關節
            endIndex = isLeft ? 25 : 26;   // 膝蓋
        } else if (boneName.includes('Leg') && !boneName.includes('UpLeg')) {
            // 小腿
            startIndex = isLeft ? 25 : 26; // 膝蓋
            endIndex = isLeft ? 27 : 28;   // 踝關節
        }

        const startJoint = points3D.find(p => p.keypointIndex === startIndex);
        const endJoint = points3D.find(p => p.keypointIndex === endIndex);

        if (!startJoint || !endJoint) {
            return { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
        }

        // 計算骨骼向量
        const boneVector = {
            x: endJoint.x - startJoint.x,
            y: endJoint.y - startJoint.y,
            z: endJoint.z - startJoint.z
        };

        // 計算旋轉角度
        const rotation = {
            x: Math.atan2(boneVector.y, Math.sqrt(boneVector.x * boneVector.x + boneVector.z * boneVector.z)) * 180 / Math.PI,
            y: Math.atan2(boneVector.x, boneVector.z) * 180 / Math.PI,
            z: 0
        };

        return { 
            translation: { x: 0, y: 0, z: 0 }, // 相對於父骨骼
            rotation 
        };
    }

    /**
     * 創建連接關係
     * @returns {Object} 連接關係
     */
    createConnections() {
        const connections = {};
        
        // 這裡應該定義物件之間的連接關係
        // 骨骼層次結構、動畫曲線到骨骼的連接等
        
        return connections;
    }

    /**
     * 創建動畫場景
     * @param {Array} motionData - 動作數據
     * @param {number} fps - 幀率
     * @returns {Object} 動畫場景
     */
    createTakes(motionData, fps) {
        const duration = motionData.length / fps;
        const fbxDuration = duration * 46186158000; // 轉換為 FBX 時間單位
        
        return {
            Take: {
                Name: "MotionCapture",
                FileName: "MotionCapture.tak",
                LocalTime: [0, fbxDuration],
                ReferenceTime: [0, fbxDuration]
            }
        };
    }

    /**
     * 轉換為二進制格式
     * @param {Object} fbxDocument - FBX 文檔
     * @returns {ArrayBuffer} 二進制數據
     */
    convertToBinary(fbxDocument) {
        // 這是一個簡化的實作
        // 實際的 FBX 二進制格式非常複雜，包含壓縮、加密等
        
        try {
            // 將 JSON 轉換為字符串
            const jsonString = JSON.stringify(fbxDocument, null, 2);
            
            // 創建二進制數據
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(jsonString);
            
            // 添加 FBX 標頭
            const header = 'Kaydara FBX Binary\x00\x1A\x00';
            const headerBytes = encoder.encode(header);
            
            // 合併數據
            const result = new ArrayBuffer(headerBytes.length + uint8Array.length);
            const resultView = new Uint8Array(result);
            resultView.set(headerBytes, 0);
            resultView.set(uint8Array, headerBytes.length);
            
            return result;
        } catch (error) {
            console.error('二進制轉換失敗:', error);
            throw new Error('二進制轉換失敗: ' + error.message);
        }
    }

    /**
     * 生成唯一物件 ID
     * @returns {number} 物件 ID
     */
    generateObjectId() {
        return this.objectId++;
    }

    /**
     * 驗證 FBX 數據
     * @param {ArrayBuffer} fbxData - FBX 二進制數據
     * @returns {boolean} 是否有效
     */
    validateFBXData(fbxData) {
        try {
            if (!fbxData || fbxData.byteLength === 0) {
                return false;
            }

            // 檢查 FBX 標頭
            const headerView = new Uint8Array(fbxData, 0, 23);
            const headerString = String.fromCharCode.apply(null, headerView);
            
            return headerString.startsWith('Kaydara FBX Binary');
        } catch (error) {
            console.error('FBX 驗證失敗:', error);
            return false;
        }
    }
}

export default FBXExporter;
