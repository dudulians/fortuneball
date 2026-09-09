import { useEffect, useRef } from "react";
import type { Answer, Lang, Rarity, Tone } from "../answers";
import { ANSWERS, answerText, sizedOnItsOwn } from "../answers";
import type { Phase } from "../Ball";
import { DIE_FONT, DIE_LETTER_SPACING_EM } from "../dieFont";
import { fitTextsInTriangle, fontString, placeBlock } from "../fitText";
import { shakeState, tiltState } from "../motion";
import { FRAG, VERT } from "./shaders";
import {
  ICO_INRADIUS,
  faceFrames,
  faceOnOrientation,
  icosahedronNormals,
  integrate,
  qSlerp,
  qToMat3,
  tumbleVelocity,
  type Quat,
} from "./die3d";

/**
 * The live window rendered in WebGL: dark liquid, a real icosahedron die with
 * an answer on every face that tumbles while shaken and surfaces with the
 * chosen answer against the glass, tiny bubbles, the glass itself.
 * If WebGL is unavailable, `onSupport(false)` is called and the CSS window stays.
 */

interface Props {
  phase: Phase;
  answer: Answer | null;
  lang: Lang;
  onSupport?: (ok: boolean) => void;
}

const RISE_MS = 1150;
const SINK_MS = 320;
const FACE_W = 0.7; // face width as a share of the window — must match App.css and shareCard
const FACE_TOP = 0.24;
const FACE_H = FACE_W * 0.866;
const FACE_CENTROID_Y = FACE_TOP + FACE_H / 3;
const DIE_K = FACE_W / 2; // reference icosahedron has edge 2 → scale so the edge equals FACE_W
const MAX_BUBBLES = 10;
const DPR_CAP = 2;

// Atlas with every answer: 5 × 4 triangle cells on a 2048² texture
const ATLAS = 2048;
const ATLAS_COLS = 5;
const ATLAS_ROWS = 4;
const CELL_W = ATLAS / ATLAS_COLS; // 409.6
const CELL_H = ATLAS / ATLAS_ROWS; // 512
const CELL_TRI_H = CELL_W * 0.866;

const FRAMES = faceFrames();

/** Power-of-two texture size close to the face's on-screen pixel size, so letters sample ~1:1 and stay crisp. */
function textureSizeFor(canvasPx: number): number {
  const facePx = canvasPx * FACE_W;
  let size = 256;
  while (size < facePx && size < 1024) size *= 2;
  return size;
}

type ToneKey = Tone | Rarity;
const TONES: Record<ToneKey, { lit: [number, number, number]; dark: [number, number, number] }> = {
  // royal blue like the real thing; the polarity shifts the hue only a touch
  positive: { lit: [0.16, 0.36, 0.86], dark: [0.05, 0.13, 0.46] },
  neutral: { lit: [0.2, 0.33, 0.84], dark: [0.07, 0.12, 0.45] },
  negative: { lit: [0.13, 0.27, 0.8], dark: [0.04, 0.09, 0.42] },
  golden: { lit: [0.93, 0.74, 0.3], dark: [0.5, 0.34, 0.09] },
  cosmic: { lit: [0.62, 0.48, 0.96], dark: [0.27, 0.17, 0.55] },
};

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  drift: number;
  phase: number;
  alpha: number;
  life: number; // seconds left
}

function easeOutQuint(x: number) {
  return 1 - Math.pow(1 - x, 5);
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("[liquid] shader error:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/**
 * Draws one answer inside a triangle whose top edge spans `T` px starting at
 * (ox, oy). Pure white letters with a thin dark contour: reads at any size and
 * still looks set into the plastic. `fontSize` is shared by every answer.
 */
function drawAnswer(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  ox: number,
  oy: number,
  T: number,
  fontSize: number
) {
  const H = T * 0.866;
  const { top, lineHeight } = placeBlock(lines.length, fontSize, H);
  ctx.font = fontString(DIE_FONT, fontSize);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const spacing = fontSize * DIE_LETTER_SPACING_EM;
  const draw = (text: string, y: number, stroke: boolean) => {
    const chars = text.split("");
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = ox + T / 2 - total / 2;
    chars.forEach((ch, i) => {
      if (stroke) ctx.strokeText(ch, cx, y);
      else ctx.fillText(ch, cx, y);
      cx += widths[i] + spacing;
    });
  };
  ctx.strokeStyle = "rgba(0,0,30,0.55)";
  ctx.lineWidth = Math.max(1.2, fontSize * 0.07);
  lines.forEach((l, i) => draw(l, oy + top + (i + 0.5) * lineHeight, true));
  ctx.fillStyle = "#ffffff";
  lines.forEach((l, i) => draw(l, oy + top + (i + 0.5) * lineHeight, false));
}

function sharedFontSize(allTexts: string[][], T: number): number {
  return fitTextsInTriangle(allTexts, {
    topWidth: T,
    height: T * 0.866,
    font: DIE_FONT,
    letterSpacingEm: DIE_LETTER_SPACING_EM,
    maxFontSize: T * 0.2,
  });
}

/**
 * The chosen answer, crisp, in face-box space (x 0..1, y 0..0.866 of the square).
 * Every text uses the one shared size; a user's own option may only be smaller
 * (when it is too long to fit at that size), never larger.
 */
function drawTextTexture(canvas: HTMLCanvasElement, lines: string[], allTexts: string[][], custom: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const T = canvas.width;
  ctx.clearRect(0, 0, T, canvas.height);
  if (!lines.length) return;
  const shared = sharedFontSize(allTexts, T);
  const size = custom ? Math.min(shared, sharedFontSize([lines], T)) : shared;
  drawAnswer(ctx, lines, 0, 0, T, size);
}

/** The 20 face answers, one triangle cell per face, in face order, at the shared size. */
function drawAtlas(canvas: HTMLCanvasElement, faceTexts: string[][], fontSize: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, ATLAS, ATLAS);
  faceTexts.forEach((lines, i) => {
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    drawAnswer(ctx, lines, col * CELL_W, row * CELL_H, CELL_W, fontSize);
  });
}

function answerFaceIndex(answer: Answer | null): number {
  if (!answer) return 0;
  const i = ANSWERS.findIndex((a) => a.id === answer.id);
  return i < 0 ? 0 : i % 20;
}

export default function LiquidWindow({ phase, answer, lang, onSupport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef(phase);
  const phaseAtRef = useRef(performance.now());
  const riseFromRef = useRef(0);
  const riseRef = useRef(0);
  const churnRef = useRef(0);
  const toneRef = useRef<ToneKey>(answer?.rarity ?? answer?.tone ?? "positive");
  const linesRef = useRef<string[]>([]);
  const customRef = useRef(false);
  const answerFaceRef = useRef(answerFaceIndex(answer));
  const textDirtyRef = useRef(true);
  const bubblesRef = useRef<Bubble[]>([]);
  const lastSpawnRef = useRef(0);
  const orientRef = useRef<Quat>(faceOnOrientation(FRAMES, answerFaceIndex(answer)));
  const omegaRef = useRef<[number, number, number]>([0, 0, 0]);

  // Phase transitions → timeline anchors
  useEffect(() => {
    const prev = phaseRef.current;
    if (prev !== phase) {
      riseFromRef.current = riseRef.current;
      phaseAtRef.current = performance.now();
      phaseRef.current = phase;
      if (phase === "rising") spawnBubbles(bubblesRef.current, 6, true);
    }
  }, [phase]);

  useEffect(() => {
    if (answer) toneRef.current = answer.rarity ?? answer.tone;
    answerFaceRef.current = answerFaceIndex(answer);
    const lines = answer ? answerText(answer, lang).split("\n") : [];
    const custom = !!answer && sizedOnItsOwn(answer);
    if (lines.join("\n") !== linesRef.current.join("\n") || custom !== customRef.current) {
      linesRef.current = lines;
      customRef.current = custom;
      textDirtyRef.current = true;
    }
  }, [answer, lang]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isDev = import.meta.env.DEV;
    const gl =
      canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        preserveDrawingBuffer: isDev,
        powerPreference: "low-power",
      }) ?? null;
    if (!gl) {
      onSupport?.(false);
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) {
      onSupport?.(false);
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("[liquid] link error:", gl.getProgramInfoLog(prog));
      onSupport?.(false);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const U = {
      time: gl.getUniformLocation(prog, "uTime"),
      rise: gl.getUniformLocation(prog, "uRise"),
      churn: gl.getUniformLocation(prog, "uChurn"),
      tilt: gl.getUniformLocation(prog, "uTilt"),
      tone: gl.getUniformLocation(prog, "uTone"),
      toneDark: gl.getUniformLocation(prog, "uToneDark"),
      text: gl.getUniformLocation(prog, "uText"),
      atlas: gl.getUniformLocation(prog, "uAtlas"),
      cellUV: gl.getUniformLocation(prog, "uCellUV"),
      cols: gl.getUniformLocation(prog, "uCols"),
      answerFace: gl.getUniformLocation(prog, "uAnswerFace"),
      bubbles: gl.getUniformLocation(prog, "uBubbles"),
      icoN: gl.getUniformLocation(prog, "uIcoN"),
      faceC: gl.getUniformLocation(prog, "uFaceC"),
      faceR: gl.getUniformLocation(prog, "uFaceR"),
      faceD: gl.getUniformLocation(prog, "uFaceD"),
      dieRot: gl.getUniformLocation(prog, "uDieRot"),
      dieCenter: gl.getUniformLocation(prog, "uDieCenter"),
      dieK: gl.getUniformLocation(prog, "uDieK"),
    };
    gl.uniform3fv(U.icoN, icosahedronNormals());
    gl.uniform3fv(U.faceC, new Float32Array(FRAMES.flatMap((f) => f.center)));
    gl.uniform3fv(U.faceR, new Float32Array(FRAMES.flatMap((f) => f.right)));
    gl.uniform3fv(U.faceD, new Float32Array(FRAMES.flatMap((f) => f.down)));
    gl.uniform1f(U.dieK, DIE_K);
    gl.uniform2f(U.cellUV, CELL_W / ATLAS, CELL_TRI_H / ATLAS);
    gl.uniform1f(U.cols, ATLAS_COLS);

    const setupTexture = (unit: number): WebGLTexture | null => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return tex;
    };
    const upload = (unit: number, tex: WebGLTexture | null, source: HTMLCanvasElement) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
    };

    // The 20 ordinary answers decide the one shared font size
    const allTexts = ANSWERS.map((a) => answerText(a, lang).split("\n"));
    const faceTexts = allTexts;

    // Unit 0: the chosen answer, crisp (sized on resize to sample ~1:1 with the screen)
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 256;
    texCanvas.height = 256;
    const tex = setupTexture(0);
    gl.uniform1i(U.text, 0);
    const uploadText = () => {
      drawTextTexture(texCanvas, linesRef.current, allTexts, customRef.current);
      upload(0, tex, texCanvas);
      textDirtyRef.current = false;
    };

    // Unit 1: the 20 face answers, for the other 19 faces
    const atlasCanvas = document.createElement("canvas");
    atlasCanvas.width = ATLAS;
    atlasCanvas.height = ATLAS;
    const atlasTex = setupTexture(1);
    gl.uniform1i(U.atlas, 1);
    let atlasDirty = true;
    const uploadAtlas = () => {
      drawAtlas(atlasCanvas, faceTexts, sharedFontSize(allTexts, CELL_W));
      upload(1, atlasTex, atlasCanvas);
      atlasDirty = false;
    };

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.load(fontString(DIE_FONT, 40)).then(() => {
      textDirtyRef.current = true;
      atlasDirty = true;
    }).catch(() => {});

    // Size
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      const texSize = textureSizeFor(w);
      if (texCanvas.width !== texSize) {
        texCanvas.width = texSize;
        texCanvas.height = texSize;
        textDirtyRef.current = true;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const bubbleData = new Float32Array(MAX_BUBBLES * 4);
    const start = performance.now();
    let last = start;
    let raf = 0;
    let running = true;

    const frame = (nowMs: number, override?: { rise?: number; churn?: number; time?: number }) => {
      const dt = Math.max(0, Math.min(0.05, (nowMs - last) / 1000));
      last = nowMs;
      const ph = phaseRef.current;
      const since = nowMs - phaseAtRef.current;

      // rise timeline
      let rise: number;
      if (ph === "rising") rise = riseFromRef.current + (1 - riseFromRef.current) * easeOutQuint(Math.min(1, since / RISE_MS));
      else if (ph === "shown") rise = 1;
      else rise = riseFromRef.current * (1 - Math.min(1, since / SINK_MS));
      riseRef.current = rise;

      // churn: quick in, out within about half a second
      const churnTarget = ph === "shaking" ? 1 : 0;
      churnRef.current += (churnTarget - churnRef.current) * (churnTarget > churnRef.current ? 0.25 : 0.12);

      // die as a solid: driven while shaken, then slowed by the liquid and steered
      // onto the chosen face — no discrete kicks and no snap once it is close
      const tSec = override?.time ?? (nowMs - start) / 1000;
      const ch = override?.churn ?? churnRef.current;
      const rs = override?.rise ?? rise;
      const driven = override ? (override.churn ?? 0) > 0.5 : ph === "shaking";
      const omega = omegaRef.current;
      // a real shake drives the tumble harder the harder the hand moves
      shakeState.vigor *= Math.exp(-dt * 3);
      if (driven) {
        const w = tumbleVelocity(tSec, (0.35 + ch * 1.4) * (0.7 + 0.8 * shakeState.vigor));
        omega[0] = w[0]; omega[1] = w[1]; omega[2] = w[2];
      } else {
        const friction = Math.exp(-dt * 5);
        omega[0] *= friction; omega[1] *= friction; omega[2] *= friction;
      }
      if (Math.hypot(omega[0], omega[1], omega[2]) > 1e-3) {
        orientRef.current = integrate(orientRef.current, omega, dt);
      }
      if (ph === "rising" || ph === "shown" || override?.rise !== undefined) {
        const target = faceOnOrientation(FRAMES, answerFaceRef.current);
        const k = 1 - Math.exp(-dt * (1.2 + 12 * rs * rs));
        orientRef.current = qSlerp(orientRef.current, target, Math.min(1, k * (1 - ch)));
        const q = orientRef.current;
        const closeness = Math.abs(q[0] * target[0] + q[1] * target[1] + q[2] * target[2] + q[3] * target[3]);
        if (closeness > 0.999995) {
          // within a few hundredths of a degree: rest exactly, kill the residual spin
          orientRef.current = target;
          omega[0] = omega[1] = omega[2] = 0;
        }
      }
      const depthDeep = 0.9 - 0.4 * ch;
      const dieZ = -(ICO_INRADIUS * DIE_K) - depthDeep * (1 - rs);
      const jitter = ch * ch * (1 - rs);                    // fades out well before the face lands
      const dieX = 0.5 + 0.12 * Math.sin(tSec * 3.1) * jitter;
      const dieY = FACE_CENTROID_Y + 0.34 * FACE_H * (1 - rs) + 0.1 * Math.cos(tSec * 2.7) * jitter;

      // bubbles
      const bubbles = bubblesRef.current;
      if (ph === "shaking" && nowMs - lastSpawnRef.current > 230) {
        spawnBubbles(bubbles, 1, false);
        lastSpawnRef.current = nowMs;
      }
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y -= b.vy * dt * (1 + churnRef.current * 0.6);
        b.x += Math.sin(nowMs / 1000 * 3 + b.phase) * b.drift * dt;
        b.life -= dt;
        const fadeTop = Math.min(1, Math.max(0, (b.y - 0.12) / 0.15));
        b.alpha = Math.min(1, b.life * 2) * fadeTop;
        if (b.life <= 0 || b.y < 0.05) bubbles.splice(i, 1);
      }
      bubbleData.fill(0);
      for (let i = 0; i < Math.min(MAX_BUBBLES, bubbles.length); i++) {
        const b = bubbles[i];
        bubbleData[i * 4] = b.x;
        bubbleData[i * 4 + 1] = b.y;
        bubbleData[i * 4 + 2] = b.r;
        bubbleData[i * 4 + 3] = b.alpha;
      }

      if (atlasDirty) uploadAtlas();
      if (textDirtyRef.current) uploadText();

      const tone = TONES[toneRef.current];
      gl.uniform1f(U.time, tSec);
      gl.uniform1f(U.rise, rs);
      gl.uniform1f(U.churn, ch);
      gl.uniform2f(U.tilt, tiltState.x, tiltState.y);
      gl.uniform3f(U.tone, tone.lit[0], tone.lit[1], tone.lit[2]);
      gl.uniform3f(U.toneDark, tone.dark[0], tone.dark[1], tone.dark[2]);
      gl.uniform1i(U.answerFace, answerFaceRef.current);
      gl.uniform4fv(U.bubbles, bubbleData);
      gl.uniformMatrix3fv(U.dieRot, false, qToMat3(orientRef.current));
      gl.uniform3f(U.dieCenter, dieX, dieY, dieZ);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const loop = (nowMs: number) => {
      if (!running) return;
      frame(nowMs);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    onSupport?.(true);

    // Dev hook: render frames with forced values (the preview pane pauses rAF).
    // A synthetic clock advances exactly one 60 fps frame per step, so physics
    // (friction, slerp) behaves as on a real device even when called in a tight loop.
    if (isDev) {
      let sim = performance.now();
      (window as unknown as { __liquid?: unknown }).__liquid = {
        render: (o: { rise?: number; churn?: number; time?: number; bubbles?: number; steps?: number }) => {
          if (o.bubbles) spawnBubbles(bubblesRef.current, o.bubbles, true);
          const n = Math.max(1, o.steps ?? 1);
          sim = Math.max(sim, last);
          for (let i = 0; i < n; i++) {
            sim += 1000 / 60;
            frame(sim, { ...o, time: (o.time ?? 0) + i / 60 });
          }
        },
        /** Angle (degrees) between the die and its resting orientation, plus residual spin. */
        state: () => {
          const target = faceOnOrientation(FRAMES, answerFaceRef.current);
          const q = orientRef.current;
          const d = Math.min(1, Math.abs(q[0] * target[0] + q[1] * target[1] + q[2] * target[2] + q[3] * target[3]));
          const w = omegaRef.current;
          return { angleDeg: (2 * Math.acos(d) * 180) / Math.PI, spin: Math.hypot(w[0], w[1], w[2]) };
        },
      };
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteTexture(tex);
      gl.deleteTexture(atlasTex);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return <canvas ref={canvasRef} className="liquid-gl" aria-hidden />;
}

function spawnBubbles(list: Bubble[], n: number, burst: boolean) {
  for (let i = 0; i < n && list.length < MAX_BUBBLES; i++) {
    list.push({
      x: 0.28 + Math.random() * 0.44,
      y: burst ? 0.95 + Math.random() * 0.25 : 0.6 + Math.random() * 0.5,
      r: 0.006 + Math.random() * 0.011,
      vy: 0.18 + Math.random() * 0.22,
      drift: 0.015 + Math.random() * 0.025,
      phase: Math.random() * 6.28,
      alpha: 0,
      life: burst ? 1.6 + Math.random() * 1.2 : 0.7 + Math.random() * 0.6,
    });
  }
}
