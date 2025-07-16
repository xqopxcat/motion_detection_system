import * as THREE from 'three';
// 額外模組
export function addAnnotation(bone, annotations, text) {
    const sprite = makeTextSprite(text);
    bone.add(sprite);
    annotations.push({ bone, sprite });
}

export function markPosture(bone, postureHighlights, color = 0x00ff00) {
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.2),
        new THREE.MeshBasicMaterial({ color })
    );
    bone.add(sphere);
    postureHighlights.push({ bone, sphere });
}

export function makeTextSprite(message, parameters = {}) {
    const fontface = parameters.fontface || "Arial";
    const fontsize = parameters.fontsize || 32;
    const maxWidth = parameters.maxWidth || 800; // 建議調大一點
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontsize}px ${fontface}`;

    // 支援中英文自動換行
    function wrapText(text, maxWidth) {
        const lines = [];
        let line = '';
        for (let i = 0; i < text.length; i++) {
            const testLine = line + text[i];
            const metrics = context.measureText(testLine);
            if (metrics.width > maxWidth && line.length > 0) {
                lines.push(line);
                line = text[i];
            } else {
                line = testLine;
            }
        }
        if (line) lines.push(line);
        return lines;
    }

    const lines = wrapText(message, maxWidth);
    const textWidth = Math.max(...lines.map(line => Math.ceil(context.measureText(line).width)));
    canvas.width = textWidth + 20;
    canvas.height = fontsize * lines.length + fontsize;

    // 重新設定 context
    context.font = `${fontsize}px ${fontface}`;
    context.fillStyle = 'rgba(255,255,255,1.0)';
    lines.forEach((line, i) => {
        context.fillText(line, 10, fontsize + i * fontsize);
    });

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set((canvas.width / canvas.height) * 10, 10, 1.0);
    return sprite;
}