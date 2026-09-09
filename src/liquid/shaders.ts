// GLSL ES 1.00 (WebGL1) — runs on every iPhone that can run the app.
// One full-screen quad; everything in the window is computed per pixel:
// dark liquid, a real icosahedron die with an answer on every face that
// tumbles and surfaces, bubbles and the glass.

export const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  // uv: x right, y DOWN (matches CSS geometry of the window)
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAG = `
precision highp float;

varying vec2 vUv;

uniform float uTime;        // seconds
uniform float uRise;        // 0 = die deep in the liquid, 1 = pressed against the glass
uniform float uChurn;       // 0 = calm, 1 = being shaken
uniform vec2  uTilt;        // device tilt, -1..1
uniform vec3  uTone;        // face colour (lit)
uniform vec3  uToneDark;    // face colour (shadow)
uniform sampler2D uText;    // the chosen answer, crisp, in face-box space (x 0..1, y 0..0.866)
uniform sampler2D uAtlas;   // all answers, one triangle cell per face
uniform vec2  uCellUV;      // cell width / atlas width, triangle height / atlas height
uniform float uCols;        // atlas columns
uniform int   uAnswerFace;  // face index carrying the chosen answer
uniform vec4  uBubbles[10]; // x, y, radius, alpha (uv space)
uniform vec3  uIcoN[20];    // icosahedron face normals (die space)
uniform vec3  uFaceC[20];   // face centres (die space, edge 2)
uniform vec3  uFaceR[20];   // face "right" (die space)
uniform vec3  uFaceD[20];   // face "down"  (die space)
uniform mat3  uDieRot;      // die space → world space
uniform vec3  uDieCenter;   // world space (x, y in uv units, z toward the viewer; the glass is z = 0)
uniform float uDieK;        // die scale (edge length = 2 * uDieK)

const float INRADIUS = 1.5115;      // face distance from centre for edge length 2

/* ---------- noise ---------- */
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

mat3 transposeM(mat3 m) {
  return mat3(m[0][0], m[1][0], m[2][0],
              m[0][1], m[1][1], m[2][1],
              m[0][2], m[1][2], m[2][2]);
}

/* Ray vs. the icosahedron (intersection of 20 half-spaces). Returns distance along the ray,
   the world-space normal, the distance to the nearest edge, the face index and the
   2D position on that face (face-box space: x 0..1 along the top edge, y 0..1 to the apex). */
float hitDie(vec3 ro, vec3 rd, out vec3 nrm, out float edgeDist, out int face, out vec2 fuv) {
  mat3 inv = transposeM(uDieRot);
  vec3 o = inv * (ro - uDieCenter);
  vec3 d = inv * rd;
  float r = INRADIUS * uDieK;
  float tIn = -1e9;
  float tOut = 1e9;
  vec3 nIn = vec3(0.0, 0.0, 1.0);
  int iIn = 0;
  for (int i = 0; i < 20; i++) {
    vec3 n = uIcoN[i];
    float dn = dot(d, n);
    if (abs(dn) < 1e-6) continue;
    float t = (r - dot(o, n)) / dn;
    if (dn < 0.0) { if (t > tIn) { tIn = t; nIn = n; iIn = i; } }
    else          { if (t < tOut) tOut = t; }
  }
  if (tIn > tOut || tOut < 0.0) return -1.0;
  vec3 hp = o + d * tIn;
  float e = 1e9;
  for (int i = 0; i < 20; i++) {
    vec3 n = uIcoN[i];
    if (n == nIn) continue;
    e = min(e, r - dot(hp, n));
  }
  edgeDist = e;
  nrm = uDieRot * nIn;
  face = iIn;
  // WebGL1 only allows constant/loop indices into uniform arrays: fetch the frame in a loop
  vec3 fc = vec3(0.0);
  vec3 fr = vec3(1.0, 0.0, 0.0);
  vec3 fd = vec3(0.0, 1.0, 0.0);
  for (int i = 0; i < 20; i++) {
    if (i == iIn) { fc = uFaceC[i]; fr = uFaceR[i]; fd = uFaceD[i]; }
  }
  vec3 rel = hp / uDieK - fc;
  float lx = dot(rel, fr);                       // -1..1 along the top edge
  float ly = dot(rel, fd);                       // -0.577 (top edge) .. 1.155 (apex)
  fuv = vec2((lx + 1.0) * 0.5, (ly + 0.57735) / 1.73205);
  return tIn;
}

void main() {
  vec2 uv = vUv;
  vec2 c = uv - 0.5;
  float r = length(c) * 2.0;            // 0 centre … 1 rim
  if (r > 1.01) { gl_FragColor = vec4(0.0); return; }

  float t = uTime;
  float rise = clamp(uRise, 0.0, 1.0);
  float churn = clamp(uChurn, 0.0, 1.0);

  /* ---------- the liquid bends what is behind it ---------- */
  vec2 flow = vec2(
    fbm(uv * 3.0 + vec2(0.0, t * 0.06) + churn * vec2(t * 0.9, 0.0)),
    fbm(uv * 3.0 + vec2(5.2, -t * 0.05) + churn * vec2(0.0, t * 1.1))
  ) - 0.5;
  // once the face rests on the glass nothing bends any more — the letters must stand still
  float calm = smoothstep(0.85, 1.0, rise) * (1.0 - smoothstep(0.0, 0.2, churn));
  float distortAmp = (0.0015 + 0.025 * (1.0 - rise) + 0.035 * churn) * (1.0 - calm);
  vec2 duv = uv + flow * distortAmp;

  /* ---------- liquid body: dark, nearly opaque, no pattern ---------- */
  float depth = smoothstep(0.0, 1.0, r);
  vec3 liquidDeep = vec3(0.004, 0.012, 0.085);
  vec3 liquidMid  = vec3(0.020, 0.060, 0.260);
  vec3 col = mix(liquidMid, liquidDeep, depth);

  // one soft light drifting slowly through the liquid
  vec2 lp = vec2(0.5 + 0.18 * sin(t * 0.21), 0.45 + 0.14 * cos(t * 0.17));
  vec2 lq = (uv - lp) / vec2(0.45, 0.38);
  float softLight = exp(-dot(lq, lq) * 1.6);
  col += vec3(0.04, 0.10, 0.32) * softLight * (0.8 + 0.6 * churn);
  // the lower half of the window is lit a little from below, so it never reads as a hole
  col += vec3(0.012, 0.04, 0.14) * smoothstep(0.45, 1.0, uv.y);

  /* ---------- the die: one solid, every face an answer ---------- */
  // Camera well back from the glass (like a photo of a real ball): mild perspective,
  // so the neighbouring faces keep their true proportions. The glass plane (z = 0) maps 1:1.
  const float EYE = 2.6;
  vec3 ro = vec3(0.5, 0.5, EYE);
  vec3 rd = normalize(vec3(duv - 0.5, -EYE));
  vec3 nrm;
  float edgeDist;
  int face;
  vec2 fuv;
  float tHit = hitDie(ro, rd, nrm, edgeDist, face, fuv);
  if (tHit > 0.0) {
    vec3 hp = ro + rd * tHit;
    float deep = max(0.0, -hp.z);                  // 0 at the glass, larger deeper
    vec3 lightDir = normalize(vec3(-0.2, -0.3, 1.0));
    float lambert = clamp(dot(nrm, lightDir), 0.0, 1.0);
    float facing = clamp(nrm.z, 0.0, 1.0);
    float front = smoothstep(0.93, 0.995, facing) * (1.0 - smoothstep(0.0, 0.3, churn));

    // plastic: each face its own flat tone. While the die tumbles the turned faces stay readable;
    // once it rests on the glass they fall away into the blue and only the answer face is lit
    vec3 dieCol = mix(uToneDark * 0.9, uTone * 1.05, 0.2 + 0.8 * lambert);
    float resting = smoothstep(0.6, 1.0, rise) * (1.0 - smoothstep(0.0, 0.3, churn));
    float turned = facing * facing * facing;
    float faceLit = mix(0.42 + 0.58 * facing, 0.08 + 0.92 * turned, resting);
    dieCol *= faceLit;

    // the face on the glass: deep even cobalt behind the letters, lighter toward the edges,
    // a little glow near the tip — never behind the text (the flat version was tried and rejected)
    float centerDist = length((fuv - vec2(0.5, 0.36)) * vec2(1.0, 1.1));
    vec3 restCol = mix(uToneDark * 1.25, uTone, smoothstep(0.12, 0.9, centerDist * 1.6));
    restCol += uTone * 0.35 * (1.0 - smoothstep(0.0, 0.45, distance(fuv, vec2(0.5, 0.92))));
    restCol *= 1.0 + 0.04 * softLight;
    dieCol = mix(dieCol, restCol, front);

    // moulded edges catch a little light
    float edgeHi = 1.0 - smoothstep(0.0, 0.008 * uDieK / 0.35, edgeDist);
    dieCol += vec3(0.30, 0.40, 0.75) * edgeHi * (0.08 + 0.25 * facing);

    // letters: the chosen answer from the crisp texture, every other face from the atlas
    float bias = clamp(deep * 3.0, 0.0, 3.0) + (1.0 - facing) * 1.5;
    vec4 txt;
    if (face == uAnswerFace) {
      txt = texture2D(uText, vec2(fuv.x, fuv.y * 0.866), bias);
    } else {
      float cx = mod(float(face), uCols);
      float cy = floor(float(face) / uCols);
      txt = texture2D(uAtlas, vec2((cx + fuv.x) * uCellUV.x, cy * 0.25 + fuv.y * uCellUV.y), bias);
    }
    float inFace = step(0.0, fuv.x) * step(fuv.x, 1.0) * step(0.0, fuv.y) * step(fuv.y, 1.0);
    // letters on the turned faces dim with their face, so they read as embossed plastic in shadow
    vec3 inkCol = txt.rgb * mix(1.0, 0.3 + 0.7 * turned, resting);
    dieCol = mix(dieCol, inkCol, txt.a * inFace * 0.97);

    // the liquid swallows what is deep: murky while the die tumbles, clearer once it rests
    // against the glass so the faces around the answer stay visible
    float murk = mix(4.5, 2.2, smoothstep(0.6, 1.0, rise) * (1.0 - churn));
    float vis = mix(0.05, 1.0, exp(-deep * murk));
    col = mix(col, dieCol, vis);
  }

  /* ---------- bubbles: tiny lenses, mostly a speck of light ---------- */
  for (int i = 0; i < 10; i++) {
    vec4 b = uBubbles[i];
    if (b.w <= 0.0) continue;
    float d = distance(uv, b.xy) / b.z;
    float body = 1.0 - smoothstep(0.85, 1.0, d);
    float rimHi = smoothstep(0.55, 0.88, d) * body;
    float lens = (1.0 - smoothstep(0.25, 0.8, d)) * body;
    float spec = 1.0 - smoothstep(0.0, 0.26, distance(uv, b.xy - vec2(b.z * 0.3, b.z * 0.34)) / b.z);
    col = mix(col, col * 0.75, lens * 0.5 * b.w);
    col += (vec3(0.55, 0.70, 1.0) * rimHi * 0.3 + vec3(1.0) * spec * 0.5) * b.w;
  }

  /* ---------- glass (the dome's reflections are drawn by the .lens layer above) ---------- */
  float rim = smoothstep(0.80, 1.0, r);
  col *= 1.0 - rim * 0.55;                          // the window wall
  float bezel = smoothstep(0.22, 0.0, uv.y) * 0.4;  // shadow under the bezel
  col *= 1.0 - bezel * mix(1.0, 0.35, smoothstep(0.9, 1.0, rise));
  vec2 specPos = vec2(0.36 + uTilt.x * 0.09, 0.20 + uTilt.y * 0.07);
  vec2 sp = (uv - specPos) / vec2(0.30, 0.15);
  float spec = exp(-dot(sp, sp) * 2.2);
  col += vec3(0.85, 0.92, 1.0) * spec * 0.06;
  vec2 sp2 = (uv - vec2(0.62 - uTilt.x * 0.05, 0.80 - uTilt.y * 0.04)) / vec2(0.22, 0.06);
  col += vec3(0.5, 0.65, 1.0) * exp(-dot(sp2, sp2) * 2.0) * 0.05;

  float alpha = 1.0 - smoothstep(0.985, 1.005, r);
  gl_FragColor = vec4(col * alpha, alpha);          // premultiplied
}
`;
