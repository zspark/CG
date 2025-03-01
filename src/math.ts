import log from "./log.js"
import utils from "./utils.js"

/*
class float32AsVec3 {
    #_rawFloat32Array = undefined;
    #_numberOfVec3 = 0;
    #_pivot = -1;
    constructor(arr32, pivot = 0) {
        if (!(arr32 instanceof Float32Array)) log.vital("[float32AsVec3] parameter must be of type Float32Array!");
        let _n = Math.floor(arr32.length / 3);
        if (_n * 3 != arr32.length) log.warn(`[float32AsVec3] parameter should have length that is times of 3, but actually with ${arr32.length}. I'll ignore extra data.`);
        this.#_numberOfVec3 = _n;
        this.#_rawFloat32Array = arr32;
        this.setPivot(pivot);
    }

    setPivot(p) {
        this.#_pivot = Math.max(0, Math.min(this.#_numberOfVec3 - 1, p));
        return this;
    }

    multiplyMat33(mat33){
        const _rawData=this.#_rawFloat32Array;
        for(let i=this.#_pivot;i<this.#_numberOfVec3;++i){
            this.multiplyMat33AtPivotOnly(mat33);
        }
    }
 
    multiplyMat33At(pivot,mat33){
        const _rawData=this.#_rawFloat32Array;
        let _indexInFloat32=this.#_pivot*3;
        _rawData[_indexInFloat32+0]=mat33;
        //TODO:
    }
}
*/
export type roMat44 = Readonly<Mat44>;
export interface xyzw {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly w: number;
    isSame: (x: number, y: number, z: number, w: number) => boolean;
}
export type rgba = xyzw;

export class Vec4 implements xyzw {
    static VEC4_0000 = Object.freeze(new Vec4(0, 0, 0, 0));
    static VEC4_1000 = Object.freeze(new Vec4(1, 0, 0, 0));
    static VEC4_0100 = Object.freeze(new Vec4(0, 1, 0, 0));
    static VEC4_0010 = Object.freeze(new Vec4(0, 0, 1, 0));
    static VEC4_0001 = Object.freeze(new Vec4(0, 0, 0, 1));

    data: Float32Array;

    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 0, storage?: Float32Array) {
        if (storage) {
            this.data = storage;
        } else {
            this.data = new Float32Array([x, y, z, w]);
        }
    }

    get x(): number { return this.data[0]; }
    get y(): number { return this.data[1]; }
    get z(): number { return this.data[2]; }
    get w(): number { return this.data[3]; }
    set x(v: number) { this.data[0] = v; }
    set y(v: number) { this.data[1] = v; }
    set z(v: number) { this.data[2] = v; }
    set w(v: number) { this.data[3] = v; }

    reset(x: number, y: number, z: number, w: number): Vec4 {
        this.data[0] = x;
        this.data[1] = y;
        this.data[2] = z;
        this.data[3] = w;
        return this;
    }

    removeX(): Vec4 { this.x = 0; return this; }
    removeY(): Vec4 { this.y = 0; return this; }
    removeZ(): Vec4 { this.z = 0; return this; }
    removeW(): Vec4 { this.w = 0; return this; }

    copyFrom(v: xyzw): Vec4 {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        this.w = v.w;
        return this;
    }

    negate(): Vec4 {
        this.x *= -1;
        this.y *= -1;
        this.z *= -1;
        this.w *= -1;
        return this;
    }

    // Magnitude and normalization
    magnitude(): number {
        return Math.sqrt(this.dot(this));
    }
    magnitudeSquared(): number {
        return this.dot(this);
    }

    isSame(x: number, y: number, z: number, w: number): boolean {
        let _fn = utils.numberSame;
        return _fn(this.data[0], x) && _fn(this.data[1], y) && _fn(this.data[2], z) && _fn(this.data[3], w);
    }
    isSameVec(vec: xyzw): boolean {
        return this.isSame(vec.x, vec.y, vec.z, vec.w);
    }

    dot(v: xyzw): number {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }

    add(x: number, y: number, z: number, w: number): Vec4 {
        this.x += x;
        this.y += y;
        this.z += z;
        this.w += w;
        return this;
    }
    addVec(v: xyzw): Vec4 {
        return this.add(v.x, v.y, v.z, v.w);
    }

    multiply(scalar: number): Vec4 {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        this.w *= scalar;
        return this;
    }

    normalize(): Vec4 {
        const mag = this.magnitude();
        if (mag === 0) { // Avoid division by zero
            return this;
        }
        return this.multiply(1 / mag);
    }

    cross(v: xyzw, outVec4: Vec4): Vec4 {
        const _x = this.x;
        const _y = this.y;
        const _z = this.z;
        const _v = outVec4 ?? new Vec4();
        _v.x = _y * v.z - _z * v.y,
            _v.y = _z * v.x - _x * v.z,
            _v.z = _x * v.y - _y * v.x
        _v.w = 0;
        return _v;
    }

    clone(): Vec4 { return new Vec4(this.x, this.y, this.z, this.w); }

    toString(): string {
        return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
    }
}


const _identityMat44Data = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
/**
* column major in store.
*/
export class Mat44 {
    static IdentityMat44 = Object.freeze(new Mat44().reset(_identityMat44Data, 0, 16));
    data = new Float32Array(16);
    constructor() { }

    static createRotateAroundX(theta: number, outMat: Mat44): Mat44 {
        (outMat ??= new Mat44()).setIdentity();
        outMat.data[5] = Math.cos(theta);
        outMat.data[9] = -Math.sin(theta);
        outMat.data[6] = Math.sin(theta);
        outMat.data[10] = Math.cos(theta);
        return outMat;
    }
    static createRotateAroundY(theta: number, outMat: Mat44): Mat44 {
        (outMat ??= new Mat44()).setIdentity();
        outMat.data[0] = Math.cos(theta);
        outMat.data[8] = Math.sin(theta);
        outMat.data[2] = -Math.sin(theta);
        outMat.data[10] = Math.cos(theta);
        return outMat;
    }
    static createRotateAroundZ(theta: number, outMat: Mat44): Mat44 {
        (outMat ??= new Mat44()).setIdentity();
        outMat.data[0] = Math.cos(theta);
        outMat.data[4] = -Math.sin(theta);
        outMat.data[1] = Math.sin(theta);
        outMat.data[5] = Math.cos(theta);
        return outMat;
    }

    static createTranslateX(delta: number, outMat: Mat44): Mat44 {
        (outMat ??= new Mat44()).setIdentity();
        outMat.data[12] = delta;
        return outMat;
    }
    static createTranslateY(delta: number, outMat: Mat44): Mat44 {
        (outMat ??= new Mat44()).setIdentity();
        outMat.data[13] = delta;
        return outMat;
    }
    static createTranslateZ(delta: number, outMat?: Mat44): Mat44 {
        (outMat ??= new Mat44()).setIdentity();
        outMat.data[14] = delta;
        return outMat;
    }
    static createScaleOfX(delta: number, outMat: Mat44): Mat44 {
        (outMat ??= new Mat44()).setIdentity();
        outMat.data[0] = delta;
        return outMat;
    }
    static createScaleOfY(delta: number, outMat: Mat44): Mat44 {
        (outMat ??= new Mat44()).setIdentity();
        outMat.data[5] = delta;
        return outMat;
    }
    static createScaleOfZ(delta: number, outMat: Mat44): Mat44 {
        (outMat ??= new Mat44()).setIdentity();
        outMat.data[10] = delta;
        return outMat;
    }
    static createScale(scaleX: number, scaleY: number, scaleZ: number, outMat: Mat44): Mat44 {
        (outMat ??= new Mat44()).setIdentity();
        outMat.data[0] = scaleX;
        outMat.data[5] = scaleY;
        outMat.data[10] = scaleZ;
        return outMat;
    }

    setIdentity(): Mat44 {
        this.data.set(_identityMat44Data, 0);
        return this;
    }

    /**
     * data should stored in column major
     */
    reset(data: Float32List, startIndex: number, length: number): Mat44 {
        if (data.length - startIndex < length) log.vital(`[Mat44] parameter lacks of elements, should be at least ${length}!`);
        this.data.set(data, 0);
        return this;
    }

    transpose(): Mat44 {
        const _data = this.data;
        let _a = _data[1]; _data[1] = _data[4]; _data[4] = _a;
        _a = _data[2]; _data[2] = _data[8]; _data[8] = _a;
        _a = _data[3]; _data[3] = _data[12]; _data[12] = _a;
        _a = _data[6]; _data[6] = _data[9]; _data[9] = _a;
        _a = _data[7]; _data[7] = _data[13]; _data[13] = _a;
        _a = _data[11]; _data[11] = _data[14]; _data[14] = _a;
        return this;
    }

    multiplyLeftTop33(mat44Right: roMat44, outMat44?: Mat44): Mat44 {
        const a = this.data;
        let a00 = a[0],
            a01 = a[1],
            a02 = a[2];
        let a10 = a[4],
            a11 = a[5],
            a12 = a[6];
        let a20 = a[8],
            a21 = a[9],
            a22 = a[10];
        const b = mat44Right.data;
        let b00 = b[0],
            b01 = b[1],
            b02 = b[2];
        let b10 = b[4],
            b11 = b[5],
            b12 = b[6];
        let b20 = b[8],
            b21 = b[9],
            b22 = b[10];
        outMat44 ??= new Mat44();
        const out = outMat44.data;
        out[0] = b00 * a00 + b01 * a10 + b02 * a20;
        out[1] = b00 * a01 + b01 * a11 + b02 * a21;
        out[2] = b00 * a02 + b01 * a12 + b02 * a22;
        out[4] = b10 * a00 + b11 * a10 + b12 * a20;
        out[5] = b10 * a01 + b11 * a11 + b12 * a21;
        out[6] = b10 * a02 + b11 * a12 + b12 * a22;
        out[8] = b20 * a00 + b21 * a10 + b22 * a20;
        out[9] = b20 * a01 + b21 * a11 + b22 * a21;
        out[10] = b20 * a02 + b21 * a12 + b22 * a22;
        return outMat44;
    }

    multiply(mat44Right: roMat44, outMat44?: Mat44): Mat44 {
        outMat44 ??= new Mat44();
        const left = this.data;
        let a00 = left[0],
            a01 = left[1],
            a02 = left[2],
            a03 = left[3];
        let a10 = left[4],
            a11 = left[5],
            a12 = left[6],
            a13 = left[7];
        let a20 = left[8],
            a21 = left[9],
            a22 = left[10],
            a23 = left[11];
        let a30 = left[12],
            a31 = left[13],
            a32 = left[14],
            a33 = left[15];
        // Cache only the current line of the second matrix
        const _outData = outMat44.data;
        const right = mat44Right.data;
        let b0 = right[0],
            b1 = right[1],
            b2 = right[2],
            b3 = right[3];
        _outData[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        _outData[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        _outData[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        _outData[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = right[4];
        b1 = right[5];
        b2 = right[6];
        b3 = right[7];
        _outData[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        _outData[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        _outData[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        _outData[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = right[8];
        b1 = right[9];
        b2 = right[10];
        b3 = right[11];
        _outData[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        _outData[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        _outData[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        _outData[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = right[12];
        b1 = right[13];
        b2 = right[14];
        b3 = right[15];
        _outData[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        _outData[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        _outData[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        _outData[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        return outMat44;
    }

    multiplyVec4(vec4: xyzw, outVec4?: Vec4): Vec4 {
        const d = this.data;
        const { x, y, z, w } = vec4;
        outVec4 ??= new Vec4();
        outVec4.x = d[0] * x + d[4] * y + d[8] * z + d[12] * w;
        outVec4.y = d[1] * x + d[5] * y + d[9] * z + d[13] * w;
        outVec4.z = d[2] * x + d[6] * y + d[10] * z + d[14] * w;
        outVec4.w = d[3] * x + d[7] * y + d[11] * z + d[15] * w;
        return outVec4;
    }

    invertTransposeLeftTop33(): Mat44 {
        const a = this.data;
        let a00 = a[0],
            a01 = a[1],
            a02 = a[2];
        let a10 = a[4],
            a11 = a[5],
            a12 = a[6];
        let a20 = a[8],
            a21 = a[9],
            a22 = a[10];
        let b01 = a22 * a11 - a12 * a21;
        let b11 = -a22 * a10 + a12 * a20;
        let b21 = a21 * a10 - a11 * a20;
        // Calculate the determinant
        let det = a00 * b01 + a01 * b11 + a02 * b21;
        if (!det) {
            return this;
        }
        det = 1.0 / det;
        a[0] = b01 * det;
        a[4] = (-a22 * a01 + a02 * a21) * det;
        a[8] = (a12 * a01 - a02 * a11) * det;
        a[1] = b11 * det;
        a[5] = (a22 * a00 - a02 * a20) * det;
        a[9] = (-a12 * a00 + a02 * a10) * det;
        a[2] = b21 * det;
        a[6] = (-a21 * a00 + a01 * a20) * det;
        a[10] = (a11 * a00 - a01 * a10) * det;
        return this;
    }

    clone(): Mat44 {
        return new Mat44().reset(this.data, 0, 16);
    }

    copyFrom(mat44: Mat44): Mat44 {
        return this.reset(mat44.data, 0, 16);
    }

    determinant(): number {
        const a = this.data;
        let a00 = a[0],
            a01 = a[1],
            a02 = a[2],
            a03 = a[3];
        let a10 = a[4],
            a11 = a[5],
            a12 = a[6],
            a13 = a[7];
        let a20 = a[8],
            a21 = a[9],
            a22 = a[10],
            a23 = a[11];
        let a30 = a[12],
            a31 = a[13],
            a32 = a[14],
            a33 = a[15];
        let b00 = a00 * a11 - a01 * a10;
        let b01 = a00 * a12 - a02 * a10;
        let b02 = a00 * a13 - a03 * a10;
        let b03 = a01 * a12 - a02 * a11;
        let b04 = a01 * a13 - a03 * a11;
        let b05 = a02 * a13 - a03 * a12;
        let b06 = a20 * a31 - a21 * a30;
        let b07 = a20 * a32 - a22 * a30;
        let b08 = a20 * a33 - a23 * a30;
        let b09 = a21 * a32 - a22 * a31;
        let b10 = a21 * a33 - a23 * a31;
        let b11 = a22 * a33 - a23 * a32;
        // Calculate the determinant
        return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    }

    invert(): Mat44 {
        const a = this.data;
        let a00 = a[0],
            a01 = a[1],
            a02 = a[2],
            a03 = a[3];
        let a10 = a[4],
            a11 = a[5],
            a12 = a[6],
            a13 = a[7];
        let a20 = a[8],
            a21 = a[9],
            a22 = a[10],
            a23 = a[11];
        let a30 = a[12],
            a31 = a[13],
            a32 = a[14],
            a33 = a[15];
        let b00 = a00 * a11 - a01 * a10;
        let b01 = a00 * a12 - a02 * a10;
        let b02 = a00 * a13 - a03 * a10;
        let b03 = a01 * a12 - a02 * a11;
        let b04 = a01 * a13 - a03 * a11;
        let b05 = a02 * a13 - a03 * a12;
        let b06 = a20 * a31 - a21 * a30;
        let b07 = a20 * a32 - a22 * a30;
        let b08 = a20 * a33 - a23 * a30;
        let b09 = a21 * a32 - a22 * a31;
        let b10 = a21 * a33 - a23 * a31;
        let b11 = a22 * a33 - a23 * a32;
        // Calculate the determinant
        let _det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        if (!_det) {
            return this;
        }
        _det = 1.0 / _det;
        a[0] = (a11 * b11 - a12 * b10 + a13 * b09) * _det;
        a[1] = (a02 * b10 - a01 * b11 - a03 * b09) * _det;
        a[2] = (a31 * b05 - a32 * b04 + a33 * b03) * _det;
        a[3] = (a22 * b04 - a21 * b05 - a23 * b03) * _det;
        a[4] = (a12 * b08 - a10 * b11 - a13 * b07) * _det;
        a[5] = (a00 * b11 - a02 * b08 + a03 * b07) * _det;
        a[6] = (a32 * b02 - a30 * b05 - a33 * b01) * _det;
        a[7] = (a20 * b05 - a22 * b02 + a23 * b01) * _det;
        a[8] = (a10 * b10 - a11 * b08 + a13 * b06) * _det;
        a[9] = (a01 * b08 - a00 * b10 - a03 * b06) * _det;
        a[10] = (a30 * b04 - a31 * b02 + a33 * b00) * _det;
        a[11] = (a21 * b02 - a20 * b04 - a23 * b00) * _det;
        a[12] = (a11 * b07 - a10 * b09 - a12 * b06) * _det;
        a[13] = (a00 * b09 - a01 * b07 + a02 * b06) * _det;
        a[14] = (a31 * b01 - a30 * b03 - a32 * b00) * _det;
        a[15] = (a20 * b03 - a21 * b01 + a22 * b00) * _det;
        return this;
    }

    setColumn(col: 0 | 1 | 2 | 3, x: number, y: number, z: number, w: number): Mat44 {
        const _data = this.data.subarray(4 * col);
        _data[0] = x;
        _data[1] = y;
        _data[2] = z;
        _data[3] = w;
        return this;
    }
    setColumns(a?: xyzw, b?: xyzw, c?: xyzw, d?: xyzw): Mat44 {
        const _data = this.data;
        if (a) {
            _data[0] = a.x;
            _data[1] = a.y;
            _data[2] = a.z;
            _data[3] = a.w;
        }

        if (b) {
            _data[4] = b.x;
            _data[5] = b.y;
            _data[6] = b.z;
            _data[7] = b.w;
        }

        if (c) {
            _data[8] = c.x;
            _data[9] = c.y;
            _data[10] = c.z;
            _data[11] = c.w;
        }

        if (d) {
            _data[12] = d.x;
            _data[13] = d.y;
            _data[14] = d.z;
            _data[15] = d.w;
        }
        return this;
    }

    print(): Mat44 {
        log.info(this.toString());
        return this;
    }
    toString(): string {
        const _data = this.data;
        return `${_data[0]}, ${_data[4]}, ${_data[8]}, ${_data[12]}
${_data[1]}, ${_data[5]}, ${_data[9]}, ${_data[13]}
${_data[2]}, ${_data[6]}, ${_data[10]}, ${_data[14]}
${_data[3]}, ${_data[7]}, ${_data[11]}, ${_data[15]}
`;
    }
}

export class Quat implements xyzw {
    static createRotateQuat(theta: number, axis: xyzw, outQuat?: Quat): Quat {
        let h = theta * .5;
        let sh = Math.sin(h), ch = Math.cos(h);
        outQuat ??= new Quat([0, 0, 0, 0]);
        outQuat.w = ch;
        outQuat.x = sh * axis.x;
        outQuat.y = sh * axis.y;
        outQuat.z = sh * axis.z;
        return outQuat;
    }

    data: Float32Array;
    constructor(dataToBeShared?: Float32List, start: number = 0, length: number = 4) {
        this.data = dataToBeShared instanceof Float32Array ? dataToBeShared.subarray(start, start + length) : new Float32Array(dataToBeShared);
    }

    get x(): number { return this.data[0]; }
    get y(): number { return this.data[1]; }
    get z(): number { return this.data[2]; }
    get w(): number { return this.data[3]; }
    set x(v: number) { this.data[0] = v; }
    set y(v: number) { this.data[1] = v; }
    set z(v: number) { this.data[2] = v; }
    set w(v: number) { this.data[3] = v; }

    identity(): Quat {
        this.data[0] = 0;
        this.data[1] = 0;
        this.data[2] = 0;
        this.data[3] = 1;
        return this;
    }

    shareVec4(vec: Vec4): Quat {
        this.data = vec.data;
        return this;
    }

    reset(x: number, y: number, z: number, w: number): Quat {
        this.data[0] = x;
        this.data[1] = y;
        this.data[2] = z;
        this.data[3] = w;
        return this;
    }

    removeX(): Quat { this.x = 0; return this; }
    removeY(): Quat { this.y = 0; return this; }
    removeZ(): Quat { this.z = 0; return this; }
    removeW(): Quat { this.w = 0; return this; }

    magnitude(): number {
        return Math.sqrt(this.dot(this));
    }
    magnitudeSquared(): number {
        return this.dot(this);
    }

    isSame(x: number, y: number, z: number, w: number): boolean {
        return (utils.numberSame(this.data[0], x) &&
            utils.numberSame(this.data[1], y) &&
            utils.numberSame(this.data[2], z) &&
            utils.numberSame(this.data[3], w));
    }

    dot(q: xyzw): number {
        return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
    }

    add(q: xyzw): Quat {
        this.data[0] += q.x;
        this.data[1] += q.y;
        this.data[2] += q.z;
        this.data[3] += q.w;
        return this;
    }

    conjugate(): Quat {
        this.data[0] *= -1;
        this.data[1] *= -1;
        this.data[2] *= -1;
        return this;
    }

    multiply(q: xyzw, outQuat?: Quat): Quat {
        let ax = this.data[0],
            ay = this.data[1],
            az = this.data[2],
            aw = this.data[3];
        let bx = q.x,
            by = q.y,
            bz = q.z,
            bw = q.w;
        outQuat ??= new Quat();
        outQuat.data[0] = ax * bw + aw * bx + ay * bz - az * by;
        outQuat.data[1] = ay * bw + aw * by + az * bx - ax * bz;
        outQuat.data[2] = az * bw + aw * bz + ax * by - ay * bx;
        outQuat.data[3] = aw * bw - ax * bx - ay * by - az * bz;
        return outQuat;
    }

    normalize(): Quat {
        let mag = this.magnitude();
        if (mag === 0) { // Avoid division by zero
            return this;
        }
        mag = 1.0 / mag;
        this.data[0] *= mag;
        this.data[1] *= mag;
        this.data[2] *= mag;
        this.data[3] *= mag;
        return this;
    }

    clone(): Quat { return new Quat([0, 0, 0, 0]).copyFrom(this); }
    copyFrom(v: xyzw): Quat {
        this.data[0] = v.x;
        this.data[1] = v.y;
        this.data[2] = v.z;
        this.data[3] = v.w;
        return this;
    }

    print(): Quat {
        log.info(this.toString());
        return this;
    }
    toString(): string {
        return `quat={${this.w}, <${this.x}, ${this.y}, ${this.z}>}`;
    }
}

