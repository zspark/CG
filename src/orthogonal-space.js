if (!CG.Vec4) CG.vital("math.js file should be loaded first!");
window.CG ??= {};



(function () {

    /**
    * we use right handed system.
    */
    class OrthogonalSpace {
        #_invMatDirty = false;
        #_transformInv = new CG.Mat44();
        #_transform = new CG.Mat44();

        constructor() {
            this.#_transform.setToIdentity();
            this.#_transformInv.setToIdentity();
        }

        get transformInv() {
            if (this.#_invMatDirty) {
                this.#_transformInv.copyFrom(this.#_transform).invert();
                this.#_invMatDirty = false;
            }
            return this.#_transformInv;
        }
        cascade(mat44Left, outMat44) {
            mat44Left.multiply(this.#_transform, outMat44);
            return outMat44;
        }
        getTransform(outMat44) {
            return outMat44.copyFrom(this.#_transform);
        }
        getAxisX(outVec4) {
            const _d = this.#_transform._dataArr32;
            return outVec4.reset(_d[0], _d[1], _d[2], _d[3]);
        }
        getAxisY(outVec4) {
            const _d = this.#_transform._dataArr32;
            return outVec4.reset(_d[4], _d[5], _d[6], _d[7]);
        }
        getAxisZ(outVec4) {
            const _d = this.#_transform._dataArr32;
            return outVec4.reset(_d[8], _d[9], _d[10], _d[11]);
        }
        getPosition(outVec4) {
            const _d = this.#_transform._dataArr32;
            return outVec4.reset(_d[12], _d[13], _d[14], _d[15]);
        }
        transform(mat44) {
            this.#_transform.multiply(mat44, this.#_transform);
            this.#_invMatDirty = true;
            return this;
        }
        transformVec4(vec4, outVec4) {
            return this.#_transform.multiplyVec4(vec4, outVec4);
        }
        setPositionVec(vec4) { return this.setPosition(vec4.x, vec4.y, vec4.z, vec4.w); }
        setPosition(x, y, z) {
            const _d = this.#_transform._dataArr32;
            _d[12] = x;
            _d[13] = y;
            _d[14] = z;
            _d[15] = 1;
            this.#_invMatDirty = true;
            return this;
        }
        setAxisXVec(vec) { return this.setAxisX(vec.x, vec.y, vec.z); }
        setAxisYVec(vec) { return this.setAxisY(vec.x, vec.y, vec.z); }
        setAxisZVec(vec) { return this.setAxisZ(vec.x, vec.y, vec.z); }
        setAxisX(x, y, z) {
            const _d = this.#_transform._dataArr32;
            _d[0] = x;
            _d[1] = y;
            _d[2] = z;
            _d[3] = 0;
            this.#_invMatDirty = true;
            return this;
        }
        setAxisY(x, y, z) {
            const _d = this.#_transform._dataArr32;
            _d[4] = x;
            _d[5] = y;
            _d[6] = z;
            _d[7] = 0;
            this.#_invMatDirty = true;
            return this;
        }
        setAxisZ(x, y, z) {
            const _d = this.#_transform._dataArr32;
            _d[8] = x;
            _d[9] = y;
            _d[10] = z;
            _d[11] = 0;
            this.#_invMatDirty = true;
            return this;
        }
        setAxisXYZVec(a, b, c) { return this.setAxisXYZ(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); }
        setAxisXYZ(xa, xb, xc, ya, yb, yc, za, zb, zc) {
            const _d = this.#_transform._dataArr32;
            _d[0] = xa;
            _d[1] = xb;
            _d[2] = xc;
            _d[3] = 0;
            _d[4] = ya;
            _d[5] = yb;
            _d[6] = yc;
            _d[7] = 0;
            _d[8] = za;
            _d[9] = zb;
            _d[10] = zc;
            _d[11] = 0;
            this.#_invMatDirty = true;
            return this;
        }
    }

    window.CG.OrthogonalSpace = OrthogonalSpace;
    CG.info('[orthogonal-space.js] loaded.');

})()
