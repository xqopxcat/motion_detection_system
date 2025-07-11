import * as THREE from 'three';

// 添加光源
export function addLights(scene) {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xff0000, 1, 500);
    pointLight.position.set(50, 50, 50);
    scene.add(pointLight);
}

// 添加地板
export function addFloor(scene) {
    const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, depthWrite: false });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(800, 40);
    scene.add(grid);

    const axesHelper = new THREE.AxesHelper(200);
    scene.add(axesHelper);
    
    // 標示 X, Y, Z 軸
    const createLabel = (text, color, position) => {
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 64px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(30, 30, 1);
        sprite.position.copy(position);
        scene.add(sprite);
    };

    createLabel('X', '#ff5555', new THREE.Vector3(240, 0, 0));
    createLabel('Y', '#55ff55', new THREE.Vector3(0, 240, 0));
    createLabel('Z', '#5555ff', new THREE.Vector3(0, 0, 240));
}