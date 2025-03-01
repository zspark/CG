import OrthogonalSpace from "./orthogonal-space.js"
import SpaceController from "./space-controller.js"
import Frustum from "./frustum.js"
import { roMat44, rgba, xyzw, Vec4, Mat44 } from "./math.js"

export interface ILight extends OrthogonalSpace {
    setColor(r: number, g: number, b: number): void;
    color: rgba;
    /**
     * we use z- as light's forward direction;
     */
    setDirection(x: number, y: number, z: number): void;
    direction: xyzw;
    update(dt: number): void;
    setAngle(value: number): void;
    angle: number;
    setCutoffDistance(value: number): void;
    cutoffDistance: number;
    lightMatrix: roMat44;
    lightProjectionMatrix: roMat44;
};

class Light extends OrthogonalSpace {
    protected _hpVec4 = new Vec4();
    protected _frustum = new Frustum();
    protected _ctrl = new SpaceController();
    protected _lightProjectionMatrix = new Mat44().setIdentity();
    protected _color = new Vec4(1, 1, 1, 1);
    constructor(posX: number, posY: number, posZ: number) {
        super();
        super.setPosition(posX, posY, posZ);
        this._ctrl.setSpace(this);
    }
    get color(): rgba { return this._color; }
    get direction(): xyzw { return this.axisZ; }
    get lightProjectionMatrix(): roMat44 {
        return this._lightProjectionMatrix;
    }
    get lightMatrix(): roMat44 {
        return this.transformInv;
    }
    setColor(r: number, g: number, b: number): void {
        this._color.reset(r, g, b, 10);
    }
    setDirection(x: number, y: number, z: number): void {
        this._hpVec4.copyFrom(this.position).add(x, y, z, 0);
        this._ctrl.axisZPointsToVec(this._hpVec4, false);
    }
    protected update(dt: number): void {
        this._frustum.projectionMatrix.multiply(this.transformInv, this._lightProjectionMatrix);
    }
}

class PointLight extends Light implements ILight {
    constructor(posX: number, posY: number, posZ: number) {
        super(posX, posY, posZ);
        this._frustum.createPerspectiveProjection(Math.PI / 2.0, 1, 1, 100);
    }
    get angle(): number { return 0; }
    get cutoffDistance(): number { return 0 }
    setAngle(value: number): void { }
    setCutoffDistance(value: number): void { }
    update(dt: number): void {
        super.update(dt);
    }
}

class ParallelLight extends Light implements ILight {
    constructor(posX: number, posY: number, posZ: number) {
        super(posX, posY, posZ);
        this._frustum.createOrthogonalProjection(-10, 10, -10, 10, 0, 100);
    }
    get angle(): number { return 0; }
    get cutoffDistance(): number { return 0 }
    setAngle(value: number): void { }
    setCutoffDistance(value: number): void { }
    update(dt: number) {
        super.update(dt);
    }
}

class SpotLight extends Light implements ILight {
    private _cutoffDis = 100;
    private _angle = Math.PI / 6;
    constructor(posX: number, posY: number, posZ: number) {
        super(posX, posY, posZ);
        this._frustum.createPerspectiveProjection(Math.PI / 3.0, 640 / 480, 1, 100);
    }
    get angle(): number { return this._angle; }
    get cutoffDistance(): number { return this._cutoffDis; }
    setAngle(value: number): void {
        this._angle = value;
    }
    setCutoffDistance(value: number): void {
        this._cutoffDis = value;
    }
    update(dt: number) {
        super.update(dt);
    }
}


export default { PointLight, ParallelLight, SpotLight }
