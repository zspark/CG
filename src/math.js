if (!CG.vital) CG.vital("log.js file should be loaded first!");
window.CG ??= {};


(function () {

    /*
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
        copyFrom(v) {
            this.x = v.x;
            this.y = v.y;
            this.z = v.z;
            this.w = v.w;
            return this;
        }

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
            let _fn = CG.Utils.numberSame;
            return _fn(this.x, x) && _fn(this.y, y) && _fn(this.z, z) && _fn(this.w, w);
        }
        isSameVec(vec) {
            let _fn = CG.Utils.numberSame;
            return _fn(this.x, vec.x) && _fn(this.y, vec.y) && _fn(this.z, vec.z) && _fn(this.w, vec.w);
        }

        // Dot product
        dot(v) {
            return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
        }

        add(x, y, z, w) {
            this.x += x;
            this.y += y;
            this.z += z;
            this.w += w;
            return this;
        }
        addVec(v) {
            return this.add(v.x, v.y, v.z, v.w);
        }

        multiply(scalar) {
            this.x *= scalar;
            this.y *= scalar;
            this.z *= scalar;
            this.w *= scalar;
            return this;
        }

        normalize() {
            const mag = this.magnitude();
            if (mag === 0) { // Avoid division by zero
                return this;
            }
            return this.multiply(1 / mag, false);
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

        add(x, y, z) {
            this.x += x;
            this.y += y;
            this.z += z;
            return this;
        }
        addVec(v) {
            return this.add(v.x, v.y, v.z);
        }

        multiply(scalar) {
            this.x *= scalar;
            this.y *= scalar;
            this.z *= scalar;
            return this;
        }

        normalize() {
            const mag = this.magnitude();
            if (mag === 0) { // Avoid division by zero
                return this;
            }
            return this.multiply(1 / mag, false);
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
    const _identityMat33Data = Object.freeze([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1]);

    /**
    * column major in store.
    */
    class Mat44 {
        _dataArr32 = new Float32Array(16);
        constructor() { }

        static createRotateAroundX(theta, outMat) {
            (outMat ??= new Mat44()).setToIdentity();
            outMat._dataArr32[5] = Math.cos(theta);
            outMat._dataArr32[9] = -Math.sin(theta);
            outMat._dataArr32[6] = Math.sin(theta);
            outMat._dataArr32[10] = Math.cos(theta);
            return outMat;
        }
        static createRotateAroundY(theta, outMat) {
            (outMat ??= new Mat44()).setToIdentity();
            outMat._dataArr32[0] = Math.cos(theta);
            outMat._dataArr32[8] = Math.sin(theta);
            outMat._dataArr32[2] = -Math.sin(theta);
            outMat._dataArr32[10] = Math.cos(theta);
            return outMat;
        }
        static createRotateAroundZ(theta, outMat) {
            (outMat ??= new Mat44()).setToIdentity();
            outMat._dataArr32[0] = Math.cos(theta);
            outMat._dataArr32[4] = -Math.sin(theta);
            outMat._dataArr32[1] = Math.sin(theta);
            outMat._dataArr32[5] = Math.cos(theta);
            return outMat;
        }

        static createTranslateX(delta, outMat) {
            (outMat ??= new Mat44()).setToIdentity();
            outMat._dataArr32[12] = delta;
            return outMat;
        }
        static createTranslateY(delta, outMat) {
            (outMat ??= new Mat44()).setToIdentity();
            outMat._dataArr32[13] = delta;
            return outMat;
        }
        static createTranslateZ(delta, outMat) {
            (outMat ??= new Mat44()).setToIdentity();
            outMat._dataArr32[14] = delta;
            return outMat;
        }
        static createScaleOfX(delta, outMat) {
            (outMat ??= new Mat44()).setToIdentity();
            outMat._dataArr32[0] = delta;
            return outMat;
        }
        static createScaleOfY(delta, outMat) {
            (outMat ??= new Mat44()).setToIdentity();
            outMat._dataArr32[5] = delta;
            return outMat;
        }
        static createScaleOfZ(delta, outMat) {
            (outMat ??= new Mat44()).setToIdentity();
            outMat._dataArr32[10] = delta;
            return outMat;
        }
        static createScaleOfSpace(delta, outMat) {
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

        multiplyLeftTop33(mat44Right, outMat44) {
            const a = this._dataArr32;
            let a00 = a[0],
                a01 = a[1],
                a02 = a[2];
            let a10 = a[4],
                a11 = a[5],
                a12 = a[6];
            let a20 = a[8],
                a21 = a[9],
                a22 = a[10];
            const b = mat44Right._dataArr32;
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
            const out = outMat44._dataArr32;
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

    class Mat33 {
        _dataArr32 = new Float32Array(9);
        constructor() { }

        static createRotateAroundX(theta, outMat) {
            (outMat ??= new Mat33()).setToIdentity();
            outMat._dataArr32[4] = Math.cos(theta);
            outMat._dataArr32[7] = -Math.sin(theta);
            outMat._dataArr32[5] = Math.sin(theta);
            outMat._dataArr32[8] = Math.cos(theta);
            return outMat;
        }
        static createRotateAroundY(theta, outMat) {
            (outMat ??= new Mat33()).setToIdentity();
            outMat._dataArr32[0] = Math.cos(theta);
            outMat._dataArr32[6] = Math.sin(theta);
            outMat._dataArr32[2] = -Math.sin(theta);
            outMat._dataArr32[8] = Math.cos(theta);
            return outMat;
        }
        static createRotateAroundZ(theta, outMat) {
            (outMat ??= new Mat33()).setToIdentity();
            outMat._dataArr32[0] = Math.cos(theta);
            outMat._dataArr32[3] = -Math.sin(theta);
            outMat._dataArr32[1] = Math.sin(theta);
            outMat._dataArr32[4] = Math.cos(theta);
            return outMat;
        }

        static createScaleOfX(delta, outMat) {
            (outMat ??= new Mat33()).setToIdentity();
            outMat._dataArr32[0] = delta;
            return outMat;
        }
        static createScaleOfY(delta, outMat) {
            (outMat ??= new Mat33()).setToIdentity();
            outMat._dataArr32[4] = delta;
            return outMat;
        }
        static createScaleOfZ(delta, outMat) {
            (outMat ??= new Mat33()).setToIdentity();
            outMat._dataArr32[8] = delta;
            return outMat;
        }
        static createScaleOfSpace(delta, outMat) {
            (outMat ??= new Mat33()).setToIdentity();
            outMat._dataArr32[0] = delta;
            outMat._dataArr32[4] = delta;
            outMat._dataArr32[8] = delta;
            return outMat;
        }

        setToIdentity() {
            const _d = this._dataArr32;
            _d[0] = 1;
            _d[1] = 0;
            _d[2] = 0;
            _d[3] = 0;
            _d[4] = 1;
            _d[5] = 0;
            _d[6] = 0;
            _d[7] = 0;
            _d[8] = 1;
            return this;
        }

        reset(arrLikeData = undefined, startIndex = 0, isRowMajor = true) {
            arrLikeData ??= _identityMat33Data;
            if (arrLikeData.length - startIndex < 9) CG.vital("[Mat44] parameter lacks of elements, should be at least 9!");
            for (let i = 0; i < 9; ++i, ++startIndex) {
                this._dataArr32[i] = arrLikeData[startIndex];
            }
            if (isRowMajor) {
                this.transpose();
            }
            return this;
        }

        transpose() {
            const _data = this._dataArr32;
            let _a = _data[1]; _data[1] = _data[3]; _data[3] = _a;
            _a = _data[2]; _data[2] = _data[6]; _data[6] = _a;
            _a = _data[5]; _data[5] = _data[7]; _data[7] = _a;
            return this;
        }

        multiply(mat33Right, outMat33) {
            const a = this._dataArr32;
            let a00 = a[0],
                a01 = a[1],
                a02 = a[2];
            let a10 = a[3],
                a11 = a[4],
                a12 = a[5];
            let a20 = a[6],
                a21 = a[7],
                a22 = a[8];
            const b = mat33Right._dataArr32;
            let b00 = b[0],
                b01 = b[1],
                b02 = b[2];
            let b10 = b[3],
                b11 = b[4],
                b12 = b[5];
            let b20 = b[6],
                b21 = b[7],
                b22 = b[8];
            outMat33 ??= new Mat33();
            const out = outMat33._dataArr32;
            out[0] = b00 * a00 + b01 * a10 + b02 * a20;
            out[1] = b00 * a01 + b01 * a11 + b02 * a21;
            out[2] = b00 * a02 + b01 * a12 + b02 * a22;
            out[3] = b10 * a00 + b11 * a10 + b12 * a20;
            out[4] = b10 * a01 + b11 * a11 + b12 * a21;
            out[5] = b10 * a02 + b11 * a12 + b12 * a22;
            out[6] = b20 * a00 + b21 * a10 + b22 * a20;
            out[7] = b20 * a01 + b21 * a11 + b22 * a21;
            out[8] = b20 * a02 + b21 * a12 + b22 * a22;
            return outMat33;
        }

        multiplyVec3(vec3, outVec3) {
            const d = this._dataArr32;
            const { x, y, z, w } = vec3;
            outVec3 ??= new Vec4();
            outVec3.x = d[0] * x + d[3] * y + d[6] * z;
            outVec3.y = d[1] * x + d[4] * y + d[7] * z;
            outVec3.z = d[2] * x + d[5] * y + d[8] * z;
            return outVec3;
        }

        clone() {
            return new Mat33().reset(this._dataArr32, 0, false);
        }

        copyFrom(mat33) {
            return this.reset(mat33._dataArr32, 0, false);
        }

        determinant() {
            const a = this._dataArr32;
            let a00 = a[0],
                a01 = a[1],
                a02 = a[2];
            let a10 = a[3],
                a11 = a[4],
                a12 = a[5];
            let a20 = a[6],
                a21 = a[7],
                a22 = a[8];
            return (
                a00 * (a22 * a11 - a12 * a21) +
                a01 * (-a22 * a10 + a12 * a20) +
                a02 * (a21 * a10 - a11 * a20)
            );
        }

        invert() {
            const a = this._dataArr32;
            let a00 = a[0],
                a01 = a[1],
                a02 = a[2];
            let a10 = a[3],
                a11 = a[4],
                a12 = a[5];
            let a20 = a[6],
                a21 = a[7],
                a22 = a[8];
            let b01 = a22 * a11 - a12 * a21;
            let b11 = -a22 * a10 + a12 * a20;
            let b21 = a21 * a10 - a11 * a20;
            // Calculate the determinant
            let det = a00 * b01 + a01 * b11 + a02 * b21;
            if (!det) {
                return null;
            }
            det = 1.0 / det;
            const out = this._dataArr32;
            out[0] = b01 * det;
            out[1] = (-a22 * a01 + a02 * a21) * det;
            out[2] = (a12 * a01 - a02 * a11) * det;
            out[3] = b11 * det;
            out[4] = (a22 * a00 - a02 * a20) * det;
            out[5] = (-a12 * a00 + a02 * a10) * det;
            out[6] = b21 * det;
            out[7] = (-a21 * a00 + a01 * a20) * det;
            out[8] = (a11 * a00 - a01 * a10) * det;
            return this;
        }

        setWithColumns(a, b, c) {
            const _data = this._dataArr32;
            if (a) {
                _data[0] = a.x;
                _data[1] = a.y;
                _data[2] = a.z;
            }

            if (b) {
                _data[4] = b.x;
                _data[5] = b.y;
                _data[6] = b.z;
            }

            if (c) {
                _data[8] = c.x;
                _data[9] = c.y;
                _data[10] = c.z;
            }
            return this;
        }

        print() {
            CG.info(this.toString());
        }
        toString() {
            const _data = this._dataArr32;
            return `${_data[0]}, ${_data[3]}, ${_data[6]}
${_data[1]}, ${_data[4]}, ${_data[7]}
${_data[2]}, ${_data[5]}, ${_data[8]}
`;
        }
    }

    class Quat {
        static createRotateQuat(theta, axis, outQuat) {
            let h = theta * .5;
            let sh = Math.sin(h), ch = Math.cos(h);
            outQuat ??= new Quat();
            outQuat.w = ch;
            outQuat.x = sh * axis.x;
            outQuat.y = sh * axis.y;
            outQuat.z = sh * axis.z;
            return outQuat;
        }

        x;
        y;
        z;
        w;
        constructor(x = 0, y = 0, z = 0, w = 1) {
            this.reset(x, y, z, w);
        }

        identity() {
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.w = 1;
            return this;
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

        dot(q) {
            return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
        }

        add(q) {
            this.x += q.x;
            this.y += q.y;
            this.z += q.z;
            this.w += q.w;
            return this;
        }

        conjugate() {
            this.x *= -1;
            this.y *= -1;
            this.z *= -1;
            return this;
        }

        multiply(q, outQuat) {
            let ax = this.x,
                ay = this.y,
                az = this.z,
                aw = this.w;
            let bx = q.x,
                by = q.y,
                bz = q.z,
                bw = q.w;
            outQuat ??= new Quat();
            outQuat.x = ax * bw + aw * bx + ay * bz - az * by;
            outQuat.y = ay * bw + aw * by + az * bx - ax * bz;
            outQuat.z = az * bw + aw * bz + ax * by - ay * bx;
            outQuat.w = aw * bw - ax * bx - ay * by - az * bz;
            return outQuat;
        }

        normalize() {
            let mag = this.magnitude();
            if (mag === 0) { // Avoid division by zero
                return this;
            }
            mag = 1.0 / mag;
            this.x *= mag;
            this.y *= mag;
            this.z *= mag;
            this.w *= mag;
            return this;
        }

        clone() { return new Quat(this.x, this.y, this.z, this.w); }
        copyFrom(q) {
            this.x = q.x;
            this.y = q.y;
            this.z = q.z;
            this.w = q.w;
            return this;
        }

        print() {
            CG.info(this.toString());
        }
        toString() {
            return `quat={${this.w}, <${this.x}, ${this.y}, ${this.z}>}`;
        }
    }

    window.CG.Vec4 = Vec4;
    window.CG.Vec3 = Vec3;
    window.CG.Mat44 = Mat44;
    window.CG.Mat33 = Mat33;
    window.CG.Quat = Quat;

    CG.info('[math.js] loaded.');

})()
