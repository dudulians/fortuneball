/**
 * The die as a solid: icosahedron geometry and a quaternion orientation that
 * tumbles while the ball is shaken and locks face-on against the glass.
 *
 * Coordinates: x right, y DOWN (like the window's uv), z toward the viewer.
 * Reference icosahedron (edge length 2): vertices (0, ±1, ±φ) + cyclic permutations.
 * Face normals: (±1,±1,±1) and (±1/φ, 0, ±φ) + cyclic, all normalised. 20 faces = 20 answers.
 */

export type Quat = [number, number, number, number]; // x, y, z, w
type Vec3 = [number, number, number];

const PHI = (1 + Math.sqrt(5)) / 2;

/** Inradius for edge length 2 (distance from centre to a face). */
export const ICO_INRADIUS = (1 + PHI) / Math.sqrt(3);

function norm3(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** The 20 face normals (unit), in a fixed order — face i carries answer i. */
export function icosahedronNormalList(): Vec3[] {
  const out: Vec3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) out.push(norm3([x, y, z]));
  const a = 1 / PHI;
  const b = PHI;
  for (const s1 of [-1, 1]) {
    for (const s2 of [-1, 1]) {
      out.push(norm3([s1 * a, 0, s2 * b]));
      out.push(norm3([0, s2 * b, s1 * a]));
      out.push(norm3([s2 * b, s1 * a, 0]));
    }
  }
  return out;
}

/** Flattened for gl.uniform3fv. */
export function icosahedronNormals(): Float32Array {
  return new Float32Array(icosahedronNormalList().flat());
}

function icosahedronVertices(): Vec3[] {
  const out: Vec3[] = [];
  for (const s1 of [-1, 1]) {
    for (const s2 of [-1, 1]) {
      out.push([0, s1, s2 * PHI]);
      out.push([s1, s2 * PHI, 0]);
      out.push([s2 * PHI, 0, s1]);
    }
  }
  return out;
}

export interface FaceFrame {
  center: Vec3; // face centroid (die space, edge 2)
  right: Vec3; // unit, along the top edge of the face's text
  down: Vec3; // unit, from the top edge toward the apex
  normal: Vec3;
}

/**
 * A local 2D frame on every face: `down` points from the face centre to one
 * vertex (the apex of the answer triangle), `right` completes a right-handed
 * frame with the normal, so (right, down, normal) → (x, y, z) when the face
 * lies on the glass with its text upright.
 */
export function faceFrames(): FaceFrame[] {
  const normals = icosahedronNormalList();
  const verts = icosahedronVertices();
  return normals.map((n) => {
    const own = verts.filter((v) => Math.abs(dot(v, n) - ICO_INRADIUS) < 1e-3);
    const center: Vec3 = [n[0] * ICO_INRADIUS, n[1] * ICO_INRADIUS, n[2] * ICO_INRADIUS];
    const apex = own[0];
    const down = norm3([apex[0] - center[0], apex[1] - center[1], apex[2] - center[2]]);
    const right = norm3(cross(down, n));
    return { center, right, down, normal: n };
  });
}

/* ---------- quaternions ---------- */

export function qMul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function qNormalize(q: Quat): Quat {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

export function qFromAxisAngle(axis: Vec3, angle: number): Quat {
  const [x, y, z] = norm3(axis);
  const s = Math.sin(angle / 2);
  return [x * s, y * s, z * s, Math.cos(angle / 2)];
}

export function qRotate(q: Quat, v: Vec3): Vec3 {
  const [qx, qy, qz, qw] = q;
  const ix = qw * v[0] + qy * v[2] - qz * v[1];
  const iy = qw * v[1] + qz * v[0] - qx * v[2];
  const iz = qw * v[2] + qx * v[1] - qy * v[0];
  const iw = -qx * v[0] - qy * v[1] - qz * v[2];
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ];
}

export function qSlerp(a: Quat, b: Quat, t: number): Quat {
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) {
    cos = -cos;
    bx = -bx; by = -by; bz = -bz; bw = -bw;
  }
  if (cos > 0.9995) {
    return qNormalize([
      a[0] + (bx - a[0]) * t,
      a[1] + (by - a[1]) * t,
      a[2] + (bz - a[2]) * t,
      a[3] + (bw - a[3]) * t,
    ]);
  }
  const theta = Math.acos(cos);
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  return [a[0] * wa + bx * wb, a[1] * wa + by * wb, a[2] * wa + bz * wb, a[3] * wa + bw * wb];
}

/** Column-major 3×3 rotation matrix for gl.uniformMatrix3fv. */
export function qToMat3(q: Quat): Float32Array {
  const [x, y, z, w] = q;
  const xx = x * x, yy = y * y, zz = z * z;
  const xy = x * y, xz = x * z, yz = y * z;
  const wx = w * x, wy = w * y, wz = w * z;
  return new Float32Array([
    1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy),
    2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx),
    2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy),
  ]);
}

/** Quaternion from a rotation matrix given as three ROWS (the matrix maps v → R·v). */
function qFromRows(r0: Vec3, r1: Vec3, r2: Vec3): Quat {
  const m00 = r0[0], m01 = r0[1], m02 = r0[2];
  const m10 = r1[0], m11 = r1[1], m12 = r1[2];
  const m20 = r2[0], m21 = r2[1], m22 = r2[2];
  const trace = m00 + m11 + m22;
  let q: Quat;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
  }
  return qNormalize(q);
}

/**
 * The orientation that lays face `i` flat on the glass with its text upright:
 * maps (right, down, normal) of that face onto (x, y, z).
 */
export function faceOnOrientation(frames: FaceFrame[], i: number): Quat {
  const f = frames[i];
  return qFromRows(f.right, f.down, f.normal);
}

/** Random-looking but smooth angular velocity (rad/s) for the tumble. */
export function tumbleVelocity(t: number, strength: number): Vec3 {
  return [
    (2.6 + 1.6 * Math.sin(t * 1.3)) * strength,
    (3.1 * Math.cos(t * 0.9 + 0.4)) * strength,
    (1.9 * Math.sin(t * 1.7 + 1.1) + 0.8) * strength,
  ];
}

/** Integrate an angular velocity over dt seconds. */
export function integrate(q: Quat, omega: Vec3, dt: number): Quat {
  const speed = Math.hypot(omega[0], omega[1], omega[2]);
  if (speed < 1e-6) return q;
  const dq = qFromAxisAngle(omega, speed * dt);
  return qNormalize(qMul(dq, q));
}
