import { roMat44, xyzw, Mat44, Vec4 } from "./math.js"

/*
export interface IOrthogonalSpace<T> {
    transformInv: roMat44;
    transform: roMat44;
    cascade(mat44Left: Mat44, outMat44: Mat44): Mat44;
    getAxisX(outVec4: Vec4): Vec4;
    getAxisY(outVec4: Vec4): Vec4;
    getAxisZ(outVec4: Vec4): Vec4;
    getPosition(outVec4: Vec4): Vec4;
    transformSelf(mat44: Mat44): T;
    transformVec4(vec4: xyzw, outVec4: Vec4): Vec4;
    setAxisXVec(vec: xyzw): T;
    setAxisYVec(vec: xyzw): T;
    setAxisZVec(vec: xyzw): T;
    setPositionVec(vec4: xyzw): T;
    setAxisX(x: number, y: number, z: number): T;
    setAxisY(x: number, y: number, z: number): T;
    setAxisZ(x: number, y: number, z: number): T;
    setPosition(x: number, y: number, z: number): T;
    setAxisXYZVec(a?: xyzw, b?: xyzw, c?: xyzw): T;
    setAxisXYZ(xa: number, xb: number, xc: number, ya: number, yb: number, yc: number, za: number, zb: number, zc: number): T;
};
*/

/**
* we use right handed system.
*/
export default class OrthogonalSpace {
    private _invMatDirty: boolean = false;
    private _transformInv: Mat44 = new Mat44();
    private _transform: Mat44 = new Mat44();

    constructor() {
        this._transform.setIdentity();
        this._transformInv.setIdentity();
    }

    get transformInv(): roMat44 {
        if (this._invMatDirty) {
            this._transformInv.copyFrom(this._transform).invert();
            this._invMatDirty = false;
        }
        return this._transformInv;
    }
    get transform(): roMat44 {
        return this._transform;
    }
    cascade(mat44Left: Mat44, outMat44: Mat44): Mat44 {
        mat44Left.multiply(this._transform, outMat44);
        return outMat44;
    }
    getAxisX(outVec4: Vec4): Vec4 {
        const _d = this._transform._dataArr32;
        return outVec4.reset(_d[0], _d[1], _d[2], _d[3]);
    }
    getAxisY(outVec4: Vec4): Vec4 {
        const _d = this._transform._dataArr32;
        return outVec4.reset(_d[4], _d[5], _d[6], _d[7]);
    }
    getAxisZ(outVec4: Vec4): Vec4 {
        const _d = this._transform._dataArr32;
        return outVec4.reset(_d[8], _d[9], _d[10], _d[11]);
    }
    getPosition(outVec4: Vec4): Vec4 {
        const _d = this._transform._dataArr32;
        return outVec4.reset(_d[12], _d[13], _d[14], _d[15]);
    }
    transformSelf(mat44: Mat44): void {
        this._transform.multiply(mat44, this._transform);
        this._invMatDirty = true;
    }
    transformVec4(vec4: xyzw, outVec4: Vec4): Vec4 {
        return this._transform.multiplyVec4(vec4, outVec4);
    }
    setAxisXVec(vec: xyzw): void { return this.setAxisX(vec.x, vec.y, vec.z); }
    setAxisYVec(vec: xyzw): void { return this.setAxisY(vec.x, vec.y, vec.z); }
    setAxisZVec(vec: xyzw): void { return this.setAxisZ(vec.x, vec.y, vec.z); }
    setPositionVec(vec4: xyzw): void { return this.setPosition(vec4.x, vec4.y, vec4.z); }
    setAxisX(x: number, y: number, z: number): void {
        this._transform.setColumn(0, x, y, z, 0);
        this._invMatDirty = true;
    }
    setAxisY(x: number, y: number, z: number): void {
        this._transform.setColumn(1, x, y, z, 0);
        this._invMatDirty = true;
    }
    setAxisZ(x: number, y: number, z: number): void {
        this._transform.setColumn(2, x, y, z, 0);
        this._invMatDirty = true;
    }
    setPosition(x: number, y: number, z: number): void {
        this._transform.setColumn(3, x, y, z, 1);
        this._invMatDirty = true;
    }
    setAxisXYZVec(a?: xyzw, b?: xyzw, c?: xyzw): void {
        this._transform.setColumns(a, b, c);
        this._invMatDirty = true;
    }
    setAxisXYZ(xa: number, xb: number, xc: number, ya: number, yb: number, yc: number, za: number, zb: number, zc: number): void {
        const _d = this._transform._dataArr32;
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
        this._invMatDirty = true;
    }
}

