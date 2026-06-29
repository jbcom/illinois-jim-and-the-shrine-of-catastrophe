/**
 * 3D model viewer — an inspection harness for the GLB models (Meshy output). Orbit
 * (drag), zoom (wheel), pan (right-drag), play animation clips, auto-spin, swap
 * backgrounds. Open it in a browser and drive it via DevTools/Safari (the controls
 * + the `window.viewer` API) to REVIEW models from every angle before they ship.
 *
 * Served by Vite from /dev/viewer/. Models are discovered from a manifest the dev
 * script writes (dev/viewer/models.json) listing GLBs under raw-assets/models.
 */
import {
  AmbientLight,
  AnimationMixer,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  GridHelper,
  Group,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type AnimationAction,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const app = document.getElementById("app") as HTMLDivElement;
const info = document.getElementById("info") as HTMLDivElement;
const modelSel = document.getElementById("model") as HTMLSelectElement;
const animSel = document.getElementById("anim") as HTMLSelectElement;
const bgSel = document.getElementById("bg") as HTMLSelectElement;

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
app.appendChild(renderer.domElement);

const scene = new Scene();
const camera = new PerspectiveCamera(45, 1, 0.01, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new AmbientLight(0xffffff, 0.7));
const key = new DirectionalLight(0xfff2d8, 1.4);
key.position.set(3, 6, 5);
scene.add(key);
const rim = new DirectionalLight(0x88aaff, 0.6);
rim.position.set(-4, 3, -5);
scene.add(rim);

const grid = new GridHelper(10, 20, 0x5a3a12, 0x2a2118);
scene.add(grid);

const loader = new GLTFLoader();
let current: Group | undefined;
let mixer: AnimationMixer | undefined;
let actions: Record<string, AnimationAction> = {};
let spinning = false;
const clock = new Clock();

function frameObject(obj: Group): void {
  const box = new Box3().setFromObject(obj);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  obj.position.sub(center);
  obj.position.y += size.y / 2; // stand it on the grid
  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = maxDim * 2.2;
  camera.position.set(dist * 0.6, size.y * 0.6, dist);
  controls.target.set(0, size.y / 2, 0);
  controls.update();
  info.textContent = `tris vary by model.\nsize ≈ ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m\nclips: ${Object.keys(actions).join(", ") || "(none)"}`;
}

async function loadModel(url: string): Promise<void> {
  if (current) {
    scene.remove(current);
    current = undefined;
  }
  mixer = undefined;
  actions = {};
  animSel.innerHTML = '<option value="">(static)</option>';
  info.textContent = "Loading…";
  const gltf = await loader.loadAsync(url);
  current = gltf.scene;
  scene.add(current);
  if (gltf.animations.length) {
    mixer = new AnimationMixer(current);
    for (const clip of gltf.animations) {
      actions[clip.name] = mixer.clipAction(clip);
      const opt = document.createElement("option");
      opt.value = clip.name;
      opt.textContent = clip.name;
      animSel.appendChild(opt);
    }
  }
  frameObject(current);
}

function playAnim(name: string): void {
  for (const a of Object.values(actions)) a.stop();
  const act = actions[name];
  if (act) act.reset().play();
}

// --- UI wiring -------------------------------------------------------------
animSel.addEventListener("change", () => playAnim(animSel.value));
(document.getElementById("play") as HTMLButtonElement).onclick = () => {
  if (animSel.value) playAnim(animSel.value);
};
(document.getElementById("pause") as HTMLButtonElement).onclick = () => {
  for (const a of Object.values(actions)) a.paused = !a.paused;
};
(document.getElementById("reset") as HTMLButtonElement).onclick = () => current && frameObject(current);
(document.getElementById("spin") as HTMLButtonElement).onclick = () => {
  spinning = !spinning;
};
bgSel.addEventListener("change", () => {
  const v = bgSel.value;
  scene.background = new Color(v === "dark" ? 0x0a0806 : v === "side" ? 0x1a2230 : 0x2a2620);
  grid.visible = v !== "side";
});
scene.background = new Color(0x2a2620);

modelSel.addEventListener("change", () => loadModel(modelSel.value));

function resize(): void {
  const w = app.clientWidth;
  const h = app.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

function tick(): void {
  requestAnimationFrame(tick);
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);
  if (spinning && current) current.rotation.y += dt * 0.6;
  controls.update();
  renderer.render(scene, camera);
}
tick();

// Expose a small API so I can drive it from DevTools (load other models, etc).
(window as unknown as { viewer: unknown }).viewer = {
  load: loadModel,
  play: playAnim,
  spin: () => (spinning = !spinning),
  scene,
  camera,
  controls,
};

// Populate the model picker from the manifest (written by the dev script).
fetch("./models.json")
  .then((r) => (r.ok ? r.json() : []))
  .then((models: { name: string; url: string }[]) => {
    for (const m of models) {
      const opt = document.createElement("option");
      opt.value = m.url;
      opt.textContent = m.name;
      modelSel.appendChild(opt);
    }
    if (models.length) loadModel(models[0]!.url);
    else info.textContent = "No models. Run: pnpm tsx scripts/viewer-manifest.ts";
  })
  .catch(() => {
    info.textContent = "No models.json. Run: pnpm tsx scripts/viewer-manifest.ts";
  });
