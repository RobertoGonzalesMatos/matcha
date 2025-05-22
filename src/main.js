import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer, controls;
let matchaMaterial;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x707070);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(-7, 1, 7);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.shadowMap.enabled = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.bias = -0.0005;

  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 20;
  directionalLight.shadow.camera.left = -5;
  directionalLight.shadow.camera.right = 5;
  directionalLight.shadow.camera.top = 5;
  directionalLight.shadow.camera.bottom = -5;

  directionalLight.position.set(2, 4, 2);
  directionalLight.target.position.set(0, 0.5, 0);
  directionalLight.castShadow = true;
  scene.add(directionalLight.target);
  scene.add(directionalLight);

  const loader = new GLTFLoader();
  loader.load("/matcha.glb", (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    model.traverse((child) => {
      if (child.isMesh && child.name === "NurbsPath001") {
        const uniforms = {
          uColorTop: { value: new THREE.Color(0xf0f0e9) },
          uColorBottom: { value: new THREE.Color(0x88b04b) },
          uMinHeight: { value: 0.0 },
          uMaxHeight: { value: 1.5 },
          uLightDirection: { value: new THREE.Vector3(2, 4, 2).normalize() },
          uCameraPosition: { value: new THREE.Vector3() },
          uTopLightDirection: { value: new THREE.Vector3(0.0, 1.0, 0.0) },
        };

        matchaMaterial = new THREE.ShaderMaterial({
          uniforms: uniforms,
          vertexShader: `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
}

          `,
          fragmentShader: `
uniform vec3 uColorTop;
uniform vec3 uColorBottom;
uniform float uMinHeight;
uniform float uMaxHeight;
uniform vec3 uCameraPosition;
uniform vec3 uTopLightDirection; 

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

float bumpNoise(vec3 pos) {
  return fract(sin(dot(pos.xyz, vec3(12.9898,78.233,45.164))) * 43758.5453);
}

void main() {
  float height = (vWorldPosition.y - uMinHeight) / (uMaxHeight - uMinHeight);
  
  height = height * 1.1 - 0.4; 
  height = clamp(height, 0.0, 1.0);

  float bumps = bumpNoise(vWorldPosition * 10.0) * 0.2;
  
  vec3 baseColor = mix(uColorBottom, uColorTop, height + bumps * 0.5);

  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
  vec3 normal = normalize(vWorldNormal);

  float viewLighting = dot(normal, viewDir);
  float topLighting = dot(normal, normalize(uTopLightDirection));

  float lighting = 0.7 * viewLighting + 0.5 * topLighting; 
  lighting = clamp(lighting, 0.4, 1.2); // allow slight brightening for highlights

  gl_FragColor = vec4(baseColor * lighting, 1.0);

}

          `,
          transparent: true,
        });

        child.material = matchaMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  if (matchaMaterial) {
    matchaMaterial.uniforms.uCameraPosition.value.copy(camera.position);
  }

  renderer.render(scene, camera);
}
