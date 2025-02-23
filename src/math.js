if (!CG.vital) CG.vital("log.js file should be loaded first!");

class float32AsVec3 {
    #_rawFloat32Array = undefined;
    #_numberOfVec3 = 0;
    #_pivot = -1;
    constructor(arr32, pivot = 0) {
        if (!(arr32 instanceof Float32Array)) CG.vital("[float32AsVec3] parameter must be of type Float32Array!");
        let _n = Math.floor(arr32.length / 3);
        if (_n * 3 != arr32.length) CG.warn(`[float32AsVec3] parameter should have length that is times of 3, but actually with ${arr32.length}. I'll ignore extra data.`);
        this.#_numberOfVec3 = _n;
        this.#_rawFloat32Array = arr32;
        this.setPivot(pivot);
    }

    setPivot(p) {
        this.#_pivot = Math.max(0, Math.min(this.#_numberOfVec3 - 1, p));
        return this;
    }

    /*
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
    */
}

class Vec4 {
    static VEC4_0000 = Object.freeze(new Vec4(0, 0, 0, 0));
    static VEC4_1000 = Object.freeze(new Vec4(1, 0, 0, 0));
    static VEC4_0100 = Object.freeze(new Vec4(0, 1, 0, 0));
    static VEC4_0010 = Object.freeze(new Vec4(0, 0, 1, 0));
    static VEC4_0001 = Object.freeze(new Vec4(0, 0, 0, 1));

    x;
    y;
    z;
    w;
    constructor(x = 0, y = 0, z = 0, w = 0) {
        this.reset(x, y, z, w);
    }

    reset(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    removeX() { this.x = 0; return this; }
    removeY() { this.y = 0; return this; }
    removeZ() { this.z = 0; return this; }
    removeW() { this.w = 0; return this; }

    negate() {
        this.x *= -1;
        this.y *= -1;
        this.z *= -1;
        this.w *= -1;
        return this;
    }

    // Magnitude and normalization
    magnitude() {
        return Math.sqrt(this.dot(this));
    }
    magnitudeSquared() {
        return this.dot(this);
    }

    isSame(x, y, z, w) {
        return (CG.Utils.numberSame(this.x, x) &&
            CG.Utils.numberSame(this.y, y) &&
            CG.Utils.numberSame(this.z, z) &&
            CG.Utils.numberSame(this.w, w));
    }

    // Dot product
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }

    add(x, y, z, w, newVec = false) {
        let _v = newVec ? this.clone() : this;
        _v.x += x;
        _v.y += y;
        _v.z += z;
        _v.w += w;
        return _v;
    }
    addVec(v, newVec = false) {
        return this.add(v.x, v.y, v.z, v.w, newVec);
    }

    multiply(scalar, newVec = false) {
        let _v = newVec ? this.clone() : this;
        _v.x *= scalar;
        _v.y *= scalar;
        _v.z *= scalar;
        _v.w *= scalar;
        return _v;
    }

    normalize(newVec = false) {
        let _v = newVec ? this.clone() : this;
        const mag = this.magnitude();
        if (mag === 0) { // Avoid division by zero
            return _v;
        }
        return _v.multiply(1 / mag, false);
    }

    cross(v, outVec4) {
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

    clone() { return new Vec4(this.x, this.y, this.z, this.w); }

    toString() {
        return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
    }
}

class Vec3 {
    x;
    y;
    z;
    constructor(x = 0, y = 0, z = 0) {
        this.reset(x, y, z);
    }

    reset(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    // Magnitude and normalization
    magnitude() {
        return Math.sqrt(this.dot(this));
    }
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    // Dot product
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v, outVec) {
        const _x = this.x;
        const _y = this.y;
        const _z = this.z;
        let _v = outVec ?? new Vec3();
        _v.x = _y * v.z - _z * v.y,
            _v.y = _z * v.x - _x * v.z,
            _v.z = _x * v.y - _y * v.x
        return _v;
    }

    add(x, y, z, newVec = false) {
        let _v = newVec ? this.clone() : this;
        _v.x += x;
        _v.y += y;
        _v.z += z;
        return _v;
    }
    addVec(v, newVec = false) {
        return this.add(v.x, v.y, v.z, newVec);
    }

    multiply(scalar, newVec = false) {
        let _v = newVec ? this.clone() : this;
        _v.x *= scalar;
        _v.y *= scalar;
        _v.z *= scalar;
        return _v;
    }

    normalize(newVec = false) {
        let _v = newVec ? this.clone() : this;
        const mag = this.magnitude();
        if (mag === 0) { // Avoid division by zero
            return _v;
        }
        return _v.multiply(1 / mag, false);
    }

    clone() { return new Vec3(this.x, this.y, this.z); }

    /*
    static fromFloat32Array(arr32,arrVec3=undefined){
        arrVec3?=arrVec3:[];
        const _N=Math.floor(arr32.length/3);
        if(_N<1)return arrVec3;
        else{
            for(let i=0;i<_N;++i){
                arrVec3[i]=new Vec3(arr32[i*3+0], arr32[i*3+1], arr32[i*3+2]);
            }
            return arrVec3;
        }
    }
    static toFloat32Array(arrVec3,arr32=undefined){
        arr32?=arr32:[];
        const _N=arrVec3.length;
        if(_N<1)return arr32;
        else{
            for(let i=0;i<_N*3;++i){
                let _v=arrVec3[i];
                arr32[i*3+0]=_v.x;
                arr32[i*3+1]=_v.y;
                arr32[i*3+2]=_v.z;
            }
            return arr32;
        }
    }
    */
    //Useful to print the vector
    toString() {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }
}

const _identityMat44Data = Object.freeze([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1]);

/**
* column major in store.
*/
class Mat44 {
    _dataArr32 = new Float32Array(16);
    constructor() { }

    static rotateAroundX(theta, outMat) {
        (outMat ??= new Mat44()).setToIdentity();
        outMat._dataArr32[5] = Math.cos(theta);
        outMat._dataArr32[9] = -Math.sin(theta);
        outMat._dataArr32[6] = Math.sin(theta);
        outMat._dataArr32[10] = Math.cos(theta);
        return outMat;
    }
    static rotateAroundY(theta, outMat) {
        (outMat ??= new Mat44()).setToIdentity();
        outMat._dataArr32[0] = Math.cos(theta);
        outMat._dataArr32[8] = Math.sin(theta);
        outMat._dataArr32[2] = -Math.sin(theta);
        outMat._dataArr32[10] = Math.cos(theta);
        return outMat;
    }
    static rotateAroundZ(theta, outMat) {
        (outMat ??= new Mat44()).setToIdentity();
        outMat._dataArr32[0] = Math.cos(theta);
        outMat._dataArr32[4] = -Math.sin(theta);
        outMat._dataArr32[1] = Math.sin(theta);
        outMat._dataArr32[5] = Math.cos(theta);
        return outMat;
    }

    static translateX(delta, outMat) {
        (outMat ??= new Mat44()).setToIdentity();
        outMat._dataArr32[12] = delta;
        return outMat;
    }
    static translateY(delta, outMat) {
        (outMat ??= new Mat44()).setToIdentity();
        outMat._dataArr32[13] = delta;
        return outMat;
    }
    static translateZ(delta, outMat) {
        (outMat ??= new Mat44()).setToIdentity();
        outMat._dataArr32[14] = delta;
        return outMat;
    }
    static scaleX(delta, outMat) {
        (outMat ??= new Mat44()).setToIdentity();
        outMat._dataArr32[0] = delta;
        return outMat;
    }
    static scaleY(delta, outMat) {
        (outMat ??= new Mat44()).setToIdentity();
        outMat._dataArr32[5] = delta;
        return outMat;
    }
    static scaleZ(delta, outMat) {
        (outMat ??= new Mat44()).setToIdentity();
        outMat._dataArr32[10] = delta;
        return outMat;
    }
    static scale(delta, outMat) {
        (outMat ??= new Mat44()).setToIdentity();
        outMat._dataArr32[0] = delta;
        outMat._dataArr32[5] = delta;
        outMat._dataArr32[10] = delta;
        return outMat;
    }

    setToIdentity() {
        for (let i = 0; i < 16; ++i) {
            this._dataArr32[i] = _identityMat44Data[i];
        }
        return this;
    }

    reset(arrLikeData = undefined, startIndex = 0, isRowMajor = true) {
        arrLikeData ??= _identityMat44Data;
        if (arrLikeData.length - startIndex < 16) CG.vital("[Mat44] parameter lacks of elements, should be at least 16!");
        for (let i = 0; i < 16; ++i, ++startIndex) {
            this._dataArr32[i] = arrLikeData[startIndex];
        }
        if (isRowMajor) {
            this.transpose();
        }
        return this;
    }

    transpose() {
        const _data = this._dataArr32;
        let _a = _data[1]; _data[1] = _data[4]; _data[4] = _a;
        _a = _data[2]; _data[2] = _data[8]; _data[8] = _a;
        _a = _data[3]; _data[3] = _data[12]; _data[12] = _a;
        _a = _data[6]; _data[6] = _data[9]; _data[9] = _a;
        _a = _data[7]; _data[7] = _data[13]; _data[13] = _a;
        _a = _data[11]; _data[11] = _data[14]; _data[14] = _a;
        return this;
    }

    multiply(mat44Right, outMat44) {
        outMat44 ??= new Mat44();
        const left = this._dataArr32;
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
        const _outData = outMat44._dataArr32;
        const right = mat44Right._dataArr32;
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

    multiplyVec4(vec4, outVec4) {
        const d = this._dataArr32;
        const { x, y, z, w } = vec4;
        outVec4 ??= new Vec4();
        outVec4.x = d[0] * x + d[4] * y + d[8] * z + d[12] * w;
        outVec4.y = d[1] * x + d[5] * y + d[9] * z + d[13] * w;
        outVec4.z = d[2] * x + d[6] * y + d[10] * z + d[14] * w;
        outVec4.w = d[3] * x + d[7] * y + d[11] * z + d[15] * w;
        return outVec4;
    }

    clone() {
        return new Mat44().reset(this._dataArr32, 0, false);
    }

    copyFrom(mat44) {
        return this.reset(mat44._dataArr32, 0, false);
    }

    determinant() {
        const a = this._dataArr32;
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

    invert() {
        const a = this._dataArr32;
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
            return null;
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

    setWithColumns(a, b, c, d) {
        const _data = this._dataArr32;
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

    print() {
        CG.info(this.toString());
    }
    toString() {
        const _data = this._dataArr32;
        return `${_data[0]}, ${_data[4]}, ${_data[8]}, ${_data[12]}
${_data[1]}, ${_data[5]}, ${_data[9]}, ${_data[13]}
${_data[2]}, ${_data[6]}, ${_data[10]}, ${_data[14]}
${_data[3]}, ${_data[7]}, ${_data[11]}, ${_data[15]}
`;
    }
}

window.CG ??= {};
window.CG.Vec4 = Vec4;
window.CG.Vec3 = Vec3;
window.CG.Mat44 = Mat44;

console.log('[util.js] loaded.');

