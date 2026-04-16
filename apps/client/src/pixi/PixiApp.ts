import { Application } from 'pixi.js';

export const LOGICAL_W = 1920;
export const LOGICAL_H = 1080;

let app: Application | null = null;

export async function initPixiApp(container: HTMLElement): Promise<Application> {
  if (app) return app;

  const preferWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;

  app = new Application();
  await app.init({
    preference: preferWebGPU ? 'webgpu' : 'webgl',
    width: LOGICAL_W,
    height: LOGICAL_H,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });

  container.appendChild(app.canvas as HTMLCanvasElement);
  fitToContainer(container);

  const ro = new ResizeObserver(() => fitToContainer(container));
  ro.observe(container);
  (app as Application & { _ro?: ResizeObserver })._ro = ro;

  return app;
}

function fitToContainer(container: HTMLElement) {
  if (!app) return;
  const { clientWidth: w, clientHeight: h } = container;
  const scale = Math.min(w / LOGICAL_W, h / LOGICAL_H);
  const canvas = app.canvas as HTMLCanvasElement;
  canvas.style.width = `${LOGICAL_W * scale}px`;
  canvas.style.height = `${LOGICAL_H * scale}px`;
}

export function getPixiApp(): Application {
  if (!app) throw new Error('PixiApp not initialized');
  return app;
}

export function destroyPixiApp() {
  if (!app) return;
  const a = app as Application & { _ro?: ResizeObserver };
  a._ro?.disconnect();
  app.destroy(true, { children: true });
  app = null;
}
