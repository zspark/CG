import { BINDING_POINT } from "./gl-const.js"
import OrthogonalSpace from "./orthogonal-space.js"
import SpaceController from "./space-controller.js"
import Frustum from "./frustum.js"
import { roMat44, rgba, xyzw, Vec4, Mat44 } from "./math.js"
import { UniformBlock } from "./device-resource.js"
import { IUniformBlock } from "./types-interfaces.js"

export interface api_ILight {
    /**
     * r,g,b : [0, 1];
     */
    setColor(r: number, g: number, b: number): void;
    color: rgba;
    /**
     * we use z- as light's forward direction;
     */
    setDirection(x: number, y: number, z: number): void;
    setPosition(x: number, y: number, z: number): void;
    position: xyzw;
    direction: xyzw;
    setAngle(value: number): void;
    angle: number;
    setCutoffDistance(value: number): void;
    cutoffDistance: number;
}

export interface ILight extends api_ILight {
    readonly UBO: IUniformBlock;
    readonly API: api_ILight;
    update(dt: number): void;
};

class Light {
    protected _hpVec4 = new Vec4();
    protected _frustum = new Frustum();
    protected _ctrl = new SpaceController();
    protected _ambientColor: Vec4;
    protected _color: Vec4;
    protected _uboData: Float32Array;
    protected _UBO: IUniformBlock;
    protected _space: OrthogonalSpace;
    protected _lightProjectionMatrix: Mat44;
    protected _specularHighlight: number = 40;
    protected _transformDirty: boolean = true;

    constructor(posX: number, posY: number, posZ: number) {
        const _sizeInFloat = 16 * 3 + 4 + 4;
        this._uboData = new Float32Array(_sizeInFloat);
        this._UBO = new UniformBlock(BINDING_POINT.UBO_BINDING_POINT_LIGHT, _sizeInFloat * 4);
        this._space = new OrthogonalSpace(this._uboData, 16 * 0);
        this._space.setPosition(posX, posY, posZ);
        this._ctrl.setSpace(this._space);
        this._lightProjectionMatrix = new Mat44(this._uboData, 16 * 2);
        this._ambientColor = new Vec4(1, 1, 1, 1, this._uboData, 16 * 3)
        this._color = new Vec4(1, 1, 1, this._specularHighlight, this._uboData, 16 * 3 + 4)
    }

    get UBO(): IUniformBlock {
        return this._UBO;
    }

    get color(): rgba {
        return this._color;
    }

    get direction(): xyzw {
        return this._space.axisZ;
    }

    get position(): xyzw {
        return this._space.getPosition(this._hpVec4);
    }

    setPosition(posX: number, posY: number, posZ: number): void {
        this._space.setPosition(posX, posY, posZ);
        this._transformDirty = true;
    }

    get lightMatrix(): roMat44 {
        return this._space.transformInv;
    }

    setColor(r: number, g: number, b: number): void {
        this._color.reset(r, g, b, this._specularHighlight);
        this._transformDirty = true;
    }

    setDirection(x: number, y: number, z: number): void {
        this._hpVec4.copyFrom(this.position).add(x, y, z, 0);
        this._ctrl.axisZPointsToVec(this._hpVec4, false);
        this._transformDirty = true;
    }

    protected update(dt: number): void {
        if (this._transformDirty) {
            this._frustum.projectionMatrix.multiply(this._space.transformInv, this._lightProjectionMatrix);
            this._UBO.uploadData(this._uboData);
            this._transformDirty = false;
        }
    }
}

class PointLight extends Light implements ILight {
    constructor(posX: number, posY: number, posZ: number) {
        super(posX, posY, posZ);
        this._frustum.createPerspectiveProjection(Math.PI / 3.0, 640 / 480, 1, 100);
        this._frustum.projectionMatrix.multiply(this._space.transformInv, this._lightProjectionMatrix);
    }
    get angle(): number { return 0; }
    get cutoffDistance(): number { return 0 }
    setAngle(value: number): void { }
    setCutoffDistance(value: number): void { }
    update(dt: number): void {
        super.update(dt);
    }
    get API(): api_ILight { return this; }

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
    get API(): api_ILight { return this; }
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
    get API(): api_ILight { return this; }
}


export default { PointLight, ParallelLight, SpotLight }
