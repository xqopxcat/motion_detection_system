import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 初始化場景、相機和渲染器
export function initScene(mount) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020);

    // 獲取容器大小
    const rect = mount.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
    camera.position.set(0, 100, 300);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 50, 0);
    controls.update();

    return { scene, camera, renderer, controls };
}


// 調整相機位置
export function adjustCamera(camera, center, size) {
    camera.position.set(center.x, center.y + size.y * 1.5, center.z + 500);
    camera.lookAt(center);
}