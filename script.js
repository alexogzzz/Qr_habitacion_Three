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

// Controles
const controls = new FirstPersonControls(camera, renderer.domElement);
controls.lookSpeed = 0.125; // Incrementar la sensibilidad del giro
controls.movementSpeed = 2.5;
controls.lookVertical = false;



// Suavizado del giro
let isDraggingView = false;

renderer.domElement.addEventListener('pointerdown', (e) => {
    isDraggingView = true;
});

renderer.domElement.addEventListener('pointermove', (e) => {
    if (isDraggingView) {
        const deltaX = e.movementX * controls.lookSpeed;
        const deltaY = e.movementY * controls.lookSpeed * 0.2; // Reducir el movimiento vertical

        // Actualizar la rotación de la cámara directamente
        controls.lon += deltaX;
        controls.lat -= deltaY;

        // Limitar la latitud para evitar que la cámara gire completamente
        controls.lat = Math.max(-85, Math.min(85, controls.lat));
    }
});

renderer.domElement.addEventListener('pointerup', () => {
    isDraggingView = false;
});

// Movimiento táctil
if (isMobile) {
    const moveSpeed = 15; 

    // Crear joystick virtual para movimiento en dispositivos móviles
    const joystickContainer = document.createElement('div');
    joystickContainer.id = 'joystick';
    document.body.appendChild(joystickContainer);

    const joystickInner = document.createElement('div');
    joystickInner.id = 'joystickInner';
    joystickContainer.appendChild(joystickInner);

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let movementDirection = new THREE.Vector3(); // Dirección del movimiento

    joystickContainer.addEventListener('pointerdown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 40); // Limitar el movimiento a 40px
            const angle = Math.atan2(dy, dx);

            const offsetX = Math.cos(angle) * distance;
            const offsetY = Math.sin(angle) * distance;

            joystickInner.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

            if (distance > 10) { // Solo mover si hay un desplazamiento significativo
                movementDirection.x = Math.cos(angle);
                movementDirection.z = -Math.sin(angle); // Invertir el eje Z para corregir el movimiento
                movementDirection.normalize();
            } else {
                movementDirection.set(0, 0, 0); // Detener el movimiento si no hay desplazamiento
            }
        }
    });

    window.addEventListener('pointerup', () => {
        isDragging = false;
        joystickInner.style.transform = 'translate(0, 0)'; // Resetear la posición del joystick
        movementDirection.set(0, 0, 0); // Detener el movimiento
    });

    // Actualizar la posición del personaje en cada cuadro de animación
    function updateMovement() {
        if (movementDirection.lengthSq() > 0) { // Si hay movimiento
            const move = new THREE.Vector3();
            camera.getWorldDirection(move);
            move.y = 0; // Evitar el movimiento vertical
            move.normalize();

            const moveVec = new THREE.Vector3();
            moveVec.addScaledVector(move, movementDirection.z * moveSpeed * 0.05);
            moveVec.addScaledVector(new THREE.Vector3(-move.z, 0, move.x), movementDirection.x * moveSpeed * 0.05);
            camera.position.add(moveVec);

            // Corregir la posición Y para evitar que el personaje "baje"
            camera.position.y = 1.5; // Mantener la altura constante
        }
    }

    // Llamar a `updateMovement` dentro del bucle de animación
    const originalAnimate = animate;
    animate = function () {
        updateMovement();
        originalAnimate();
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
