import * as THREE from 'three';

// --- 工具與功能函式 ---
export function createBoneMeshes(boneRoot, boneMeshes, group) {
    boneRoot.traverse((bone) => {
        if (bone.isBone && bone.parent) {
            const parentPosition = bone.parent.getWorldPosition(new THREE.Vector3());
            const childPosition = bone.getWorldPosition(new THREE.Vector3());
            const direction = new THREE.Vector3().subVectors(childPosition, parentPosition);
            const length = direction.length();

            const geometry = new THREE.CylinderGeometry(0.5, 0.5, length, 8);
            const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
            const mesh = new THREE.Mesh(geometry, material);

            mesh.position.copy(parentPosition.clone().add(direction.multiplyScalar(0.5)));
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
            mesh.scale.set(1, length / mesh.geometry.parameters.height, 1);

            group.add(mesh);

            boneMeshes.push({ bone, mesh });
        }
    });
}

// 創建骨架的球體
export function createJointSpheres(boneRoot, jointSpheres, group) {
    const addJointSpheres = (bone) => {
        const sphereGeometry = new THREE.SphereGeometry(1);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        group.add(sphere);
        jointSpheres.push({ bone, sphere });
        bone.children.forEach((child) => {
            if (child.isBone) addJointSpheres(child);
        });
    };
    addJointSpheres(boneRoot);
}

// 計算骨骼的邊界框和最低點
export function calculateBoundingBox(boneRoot) {
    const bbox = new THREE.Box3();
    let minY = Infinity;

    boneRoot.traverse((bone) => {
        if (bone.isBone) {
            const position = bone.getWorldPosition(new THREE.Vector3());
            if (position.y < minY) minY = position.y;
            bbox.expandByPoint(position);
        }
    });

    const offset = minY;
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());

    return { offset, center, size };
}

// import * as THREE from 'three';

// // --- 工具與功能函式 ---
// export function createBoneMeshes(boneRoot, boneMeshes) {
//     boneRoot.traverse((bone) => {
//         if (bone.isBone && bone.parent) {
//             const parentPosition = bone.parent.getWorldPosition(new THREE.Vector3());
//             const childPosition = bone.getWorldPosition(new THREE.Vector3());
//             const direction = new THREE.Vector3().subVectors(childPosition, parentPosition);
//             const length = direction.length();

//             const geometry = new THREE.CylinderGeometry(0.5, 0.5, length, 8);
//             const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
//             const mesh = new THREE.Mesh(geometry, material);

//             mesh.position.copy(parentPosition.clone().add(direction.multiplyScalar(0.5)));
//             mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
//             mesh.scale.set(1, length / mesh.geometry.parameters.height, 1);
//             bone.add(mesh);
//             boneMeshes.push({ bone, mesh });
//         }
//     });
// }

// // 創建骨架的球體
// export function createJointSpheres(boneRoot, jointSpheres) {
//     const addJointSpheres = (bone) => {
//         const sphereGeometry = new THREE.SphereGeometry(1);
//         const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
//         const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
//         bone.add(sphere);
//         jointSpheres.push({ bone, sphere });
//         bone.children.forEach((child) => {
//             if (child.isBone) addJointSpheres(child);
//         });
//     };
//     addJointSpheres(boneRoot);
// }