import { roMat44, xyzw, Mat44, Vec4 } from "./math.js"
import { default as EventDispatcher, Event_t } from "./event.js"

/**
* we use right handed system.
*/
export default class OrthogonalSpace extends EventDispatcher {
    static TRANSFORM_CHANGED: number = 1;

    private _invMatDirty: boolean = false;
    private _axisX: Vec4;
    private _axisY: Vec4;
    private _axisZ: Vec4;
    private _axisW: Vec4;

    protected _transformInv: Mat44;
    protected _transform: Mat44;
    protected _event: Event_t;

    constructor(storage?: Float32Array, index: number = 0) {
        super();
        this._transform = new Mat44(storage, index);
        this._transformInv = new Mat44(storage, index + 16).setIdentity();
        const _data = this._transform.data;
        this._axisX = new Vec4(1, 0, 0, 0, _data, 0);
        this._axisY = new Vec4(0, 1, 0, 0, _data, 4);
        this._axisZ = new Vec4(0, 0, 1, 0, _data, 8);
        this._axisW = new Vec4(0, 0, 0, 1, _data, 12);
        this._event = {
            type: OrthogonalSpace.TRANSFORM_CHANGED,
            sender: this,
        };
    }

    private set invMatDirty(v: boolean) {
        this._invMatDirty = v;
        this._broadcast(this._event);
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
    transformInvSelf(mat44: roMat44): void {
        mat44.multiply(this._transform, this._transform);
        this.invMatDirty = true;
    }
    transformSelf(mat44: roMat44): void {
        this._transform.multiply(mat44, this._transform);
        this.invMatDirty = true;
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
        this.invMatDirty = true;
    }
    setAxisY(x: number, y: number, z: number): void {
        this._axisY.reset(x, y, z, 0);
        this.invMatDirty = true;
    }
    setAxisZ(x: number, y: number, z: number): void {
        this._axisZ.reset(x, y, z, 0);
        this.invMatDirty = true;
    }
    setPosition(x: number, y: number, z: number): void {
        this._axisW.reset(x, y, z, 1);
        this.invMatDirty = true;
    }
    setAxisXYZVec(a?: xyzw, b?: xyzw, c?: xyzw): void {
        this._transform.setColumns(a, b, c);
        this.invMatDirty = true;
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
        this.invMatDirty = true;
    }
}

