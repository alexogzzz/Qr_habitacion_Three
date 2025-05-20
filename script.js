import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 3); // Ajusta la posición inicial de la cámara

// Render con menor resolución para móviles
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const pixelRatio = isMobile ? 0.75 : 1;

const renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controles móviles: botones de movimiento y touch para mirar
if (isMobile) {
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'controlsDiv';
    document.body.appendChild(controlsDiv);

    const btns = [
        { id: 'forward', label: '▲' },
        { id: 'left', label: '◀' },
        { id: 'back', label: '▼' },
        { id: 'right', label: '▶' }
    ];
    btns.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.id = id;
        btn.innerText = label;
        controlsDiv.appendChild(btn);
    });

    const moveState = { forward: false, back: false, left: false, right: false };
    const moveSpeed = 2.5;

    ['forward', 'back', 'left', 'right'].forEach(dir => {
        const btn = document.getElementById(dir);
        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            moveState[dir] = true;
        });
        btn.addEventListener('touchend', e => {
            e.preventDefault();
            moveState[dir] = false;
        });
    });

    const origUpdate = controls.update.bind(controls);
    controls.update = function (delta) {
        const direction = new THREE.Vector3();
        if (moveState.forward) direction.z -= 1;
        if (moveState.back) direction.z += 1;
        if (moveState.left) direction.x -= 1;
        if (moveState.right) direction.x += 1;

        if (direction.lengthSq() > 0) {
            direction.normalize();
            const move = new THREE.Vector3();
            camera.getWorldDirection(move);
            move.y = 0;
            move.normalize();

            const right = new THREE.Vector3().crossVectors(camera.up, move).normalize();
            const moveVec = new THREE.Vector3();
            moveVec.addScaledVector(move, direction.z);
            moveVec.addScaledVector(right, direction.x);
            moveVec.normalize().multiplyScalar(moveSpeed * delta);
            camera.position.add(moveVec);
        }

        origUpdate(delta);
    };
}

// Luz direccional
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 4, 2);
scene.add(light);

// Luz ambiental
const ambient = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambient);

// Cargar modelo GLB
const loader = new GLTFLoader();
loader.load('model/room.glb', function (gltf) {
    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
        }
    });

    // Centrar el modelo en la escena
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    gltf.scene.position.sub(center);

    scene.add(gltf.scene);
    console.log("Modelo cargado correctamente");
}, undefined, function (error) {
    console.error("Error al cargar modelo:", error);
});

// Controles
const controls = new FirstPersonControls(camera, renderer.domElement);
controls.lookSpeed = 0.08;
controls.movementSpeed = 2.5;
controls.lookVertical = true;

// Animación
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    controls.update(delta);
    renderer.render(scene, camera);
}
animate();

// Ajustar al redimensionar
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
