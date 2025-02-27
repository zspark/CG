import { roMat44, xyzw, Mat44, Vec4 } from "./math.js"

/**
* we use right handed system.
*/
export default class OrthogonalSpace {
    private _invMatDirty: boolean = false;
    private _transformInv: Mat44 = new Mat44();
    private _transform: Mat44 = new Mat44();
    private _axisX: Vec4;
    private _axisY: Vec4;
    private _axisZ: Vec4;
    private _axisW: Vec4;

    constructor() {
        this._transform.setIdentity();
        this._transformInv.setIdentity();
        const _data = this._transform.data;
        this._axisX = new Vec4(0, 0, 0, 0, _data.subarray(0, 4));
        this._axisY = new Vec4(0, 0, 0, 0, _data.subarray(4, 8));
        this._axisZ = new Vec4(0, 0, 0, 0, _data.subarray(8, 12));
        this._axisW = new Vec4(0, 0, 0, 0, _data.subarray(12, 16));
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
    transformSelf(mat44: Mat44): void {
        this._transform.multiply(mat44, this._transform);
        this._invMatDirty = true;
    }
    transformVec4(vec4: xyzw, outVec4: Vec4): Vec4 {
        return this._transform.multiplyVec4(vec4, outVec4);
    }
    getAxisX(outVec4: Vec4): Vec4 {
        return outVec4.copyFrom(this._axisX);
    }
    getAxisY(outVec4: Vec4): Vec4 {
        return outVec4.copyFrom(this._axisY);
    }
    getAxisZ(outVec4: Vec4): Vec4 {
        return outVec4.copyFrom(this._axisZ);
    }
    getPosition(outVec4: Vec4): Vec4 {
        return outVec4.copyFrom(this._axisW);
    }
    get axisX(): xyzw { return this._axisX; }
    get axisY(): xyzw { return this._axisY; }
    get axisZ(): xyzw { return this._axisZ; }
    get position(): xyzw { return this._axisW; }
    setAxisXVec(vec: xyzw): void { return this.setAxisX(vec.x, vec.y, vec.z); }
    setAxisYVec(vec: xyzw): void { return this.setAxisY(vec.x, vec.y, vec.z); }
    setAxisZVec(vec: xyzw): void { return this.setAxisZ(vec.x, vec.y, vec.z); }
    setPositionVec(vec4: xyzw): void { return this.setPosition(vec4.x, vec4.y, vec4.z); }
    setAxisX(x: number, y: number, z: number): void {
        this._axisX.reset(x, y, z, 0);
        this._invMatDirty = true;
    }
    setAxisY(x: number, y: number, z: number): void {
        this._axisY.reset(x, y, z, 0);
        this._invMatDirty = true;
    }
    setAxisZ(x: number, y: number, z: number): void {
        this._axisZ.reset(x, y, z, 0);
        this._invMatDirty = true;
    }
    setPosition(x: number, y: number, z: number): void {
        this._axisW.reset(x, y, z, 1);
        this._invMatDirty = true;
    }
    setAxisXYZVec(a?: xyzw, b?: xyzw, c?: xyzw): void {
        this._transform.setColumns(a, b, c);
        this._invMatDirty = true;
    }
    setAxisXYZ(xa: number, xb: number, xc: number, ya: number, yb: number, yc: number, za: number, zb: number, zc: number): void {
        const _d = this._transform.data;
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

