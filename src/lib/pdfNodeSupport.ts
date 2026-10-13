import { createRequire } from "node:module";

// pdf.js (inside pdf-parse) expects a browser DOMMatrix and evaluates `new DOMMatrix()`
// as soon as it loads. In Node it normally gets one from the native @napi-rs/canvas
// add-on; if that add-on is not shipped with the deployed function, loading pdf-parse
// crashes with "DOMMatrix is not defined" before any code of ours can run.
//
// Our PDF work only reads text and table geometry (it never draws pages), so when the
// native add-on is unavailable a small matrix class is enough. Call this before
// importing pdf-parse or pdfjs-dist.

type Matrix6 = [number, number, number, number, number, number];

class FallbackDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  is2D = true;

  constructor(init?: number[] | string | null) {
    if (Array.isArray(init)) {
      if (init.length === 6) [this.a, this.b, this.c, this.d, this.e, this.f] = init as Matrix6;
      else if (init.length === 16) {
        this.a = init[0];
        this.b = init[1];
        this.c = init[4];
        this.d = init[5];
        this.e = init[12];
        this.f = init[13];
      }
    }
  }

  get isIdentity() {
    return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0;
  }

  private static product(left: Matrix6, right: Matrix6): Matrix6 {
    const [a1, b1, c1, d1, e1, f1] = left;
    const [a2, b2, c2, d2, e2, f2] = right;
    return [
      a1 * a2 + c1 * b2,
      b1 * a2 + d1 * b2,
      a1 * c2 + c1 * d2,
      b1 * c2 + d1 * d2,
      a1 * e2 + c1 * f2 + e1,
      b1 * e2 + d1 * f2 + f1,
    ];
  }

  private values(): Matrix6 {
    return [this.a, this.b, this.c, this.d, this.e, this.f];
  }

  private assign(values: Matrix6) {
    [this.a, this.b, this.c, this.d, this.e, this.f] = values;
    return this;
  }

  private static from(other: Partial<FallbackDOMMatrix> | number[] | undefined): Matrix6 {
    if (Array.isArray(other)) return new FallbackDOMMatrix(other).values();
    const o = other || {};
    return [o.a ?? 1, o.b ?? 0, o.c ?? 0, o.d ?? 1, o.e ?? 0, o.f ?? 0];
  }

  multiplySelf(other?: Partial<FallbackDOMMatrix>) {
    return this.assign(FallbackDOMMatrix.product(this.values(), FallbackDOMMatrix.from(other)));
  }

  preMultiplySelf(other?: Partial<FallbackDOMMatrix>) {
    return this.assign(FallbackDOMMatrix.product(FallbackDOMMatrix.from(other), this.values()));
  }

  multiply(other?: Partial<FallbackDOMMatrix>) {
    return new FallbackDOMMatrix(this.values()).multiplySelf(other);
  }

  translate(tx = 0, ty = 0) {
    return new FallbackDOMMatrix(this.values()).multiplySelf({ a: 1, b: 0, c: 0, d: 1, e: tx, f: ty });
  }

  scale(sx = 1, sy = sx) {
    return new FallbackDOMMatrix(this.values()).multiplySelf({ a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 });
  }

  invertSelf() {
    const determinant = this.a * this.d - this.b * this.c;
    if (!determinant) return this.assign([NaN, NaN, NaN, NaN, NaN, NaN]);
    return this.assign([
      this.d / determinant,
      -this.b / determinant,
      -this.c / determinant,
      this.a / determinant,
      (this.c * this.f - this.d * this.e) / determinant,
      (this.b * this.e - this.a * this.f) / determinant,
    ]);
  }

  inverse() {
    return new FallbackDOMMatrix(this.values()).invertSelf();
  }

  transformPoint(point: { x?: number; y?: number } = {}) {
    const x = point.x ?? 0;
    const y = point.y ?? 0;
    return { x: this.a * x + this.c * y + this.e, y: this.b * x + this.d * y + this.f, z: 0, w: 1 };
  }
}

export function ensurePdfNodeSupport() {
  const scope = globalThis as unknown as Record<string, unknown>;
  if (typeof scope.DOMMatrix !== "undefined") return;

  // Prefer the real implementation when the native add-on is present.
  try {
    const canvas = createRequire(`${process.cwd()}/package.json`)("@napi-rs/canvas") as Record<string, unknown>;
    if (canvas?.DOMMatrix) {
      scope.DOMMatrix = canvas.DOMMatrix;
      if (typeof scope.ImageData === "undefined" && canvas.ImageData) scope.ImageData = canvas.ImageData;
      if (typeof scope.Path2D === "undefined" && canvas.Path2D) scope.Path2D = canvas.Path2D;
      return;
    }
  } catch {
    // Fall through to the built-in fallback.
  }

  scope.DOMMatrix = FallbackDOMMatrix;
}
