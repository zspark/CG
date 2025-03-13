import log from "./log.js"
import { xyzw, roMat44, Mat44, Vec4 } from "./math.js"
import OrthogonalSpace from "./orthogonal-space.js"
import Frustum from "./frustum.js"
import SpaceController from "./space-controller.js"
import { MouseEvents_t, mouseEventCallback } from "./mouse-events.js"
import { UniformBlock } from "./device-resource.js"
import { IUniformBlock } from "./types-interfaces.js"

export interface ICamera {
    readonly position: xyzw;
    readonly frustum: Frustum;
    readonly _UBO: IUniformBlock;

    setMouseEvents(events: MouseEvents_t): ICamera;
    viewMatrix: roMat44;
    viewProjectionMatrix: roMat44;
    update(dt: number): void;

    setFrustum(frustum: Frustum): ICamera
    moveHorizontally(deltaX: number, delta: number): ICamera
    moveAround(pos: xyzw, dir_normalized: xyzw, theta: number): ICamera;
    /**
    * pos must be defined under world coordinate
    */
    lookAt(pos: xyzw): ICamera
    setRotateCenter(posX: number, posY: number, posZ: number): ICamera;
};

export default class Camera implements ICamera {
    static NEAR_PLANE: number = 1;
    static FAR_PLANE: number = 100;
    static UBO_BINDING_POINT: number = 0;

    _UBO: IUniformBlock;
    private _rotateCenterPosition = new Vec4();
    private _helperMat44 = new Mat44();
    private _helperVec4_x = new Vec4();
    private _helperVec4_y = new Vec4();
    private _helperVec4_z = new Vec4();
    private _spaceCtrl: SpaceController;
    private _space: OrthogonalSpace;
    private _viewProjectionMatrix: Mat44;
    private _frustum: Frustum;
    private _cameraDirtyFlag: boolean = true;
    private _uboData: Float32Array;

    constructor(posX: number, posY: number, posZ: number) {
        const _sizeInFloat = 5 * 16; // 5 matrices;
        this._uboData = new Float32Array(_sizeInFloat);
        this._UBO = new UniformBlock(Camera.UBO_BINDING_POINT, _sizeInFloat * 4);
        this._space = new OrthogonalSpace(this._uboData, 16 * 0);
        this._space.setPosition(posX, posY, posZ);
        this._spaceCtrl = new SpaceController(this._space);
        this._frustum = new Frustum(this._uboData, 16 * 2);
        this._frustum.createPerspectiveProjection(Math.PI / 3, 640 / 480, Camera.NEAR_PLANE, Camera.FAR_PLANE);
        this._viewProjectionMatrix = new Mat44(this._uboData, 16 * 4);
        this._frustum.projectionMatrix.multiply(this.viewMatrix, this._viewProjectionMatrix);
    }

    get position(): xyzw {
        return this._space.getPosition(this._helperVec4_z);
    }

    get frustum(): Frustum {
        return this._frustum;
    }

    setMouseEvents(events: MouseEvents_t): Camera {
        let _onMoveFn: mouseEventCallback;
        const _onDown: mouseEventCallback = (evt) => {
            //log.info(evt);
            events.offDown(_onDown);
            events.onUp(_onUp);
            /*
             * 0: Left mouse button
             * 1: Middle mouse button (or wheel button)
             * 2: Right mouse button
            */
            _onMoveFn = evt.button === 0 ? _onMoveLeft : _onMoveRight;
            events.onMove(_onMoveFn);
        };
        const _onUp: mouseEventCallback = (evt) => {
            events.offUp(_onUp);
            events.offMove(_onMoveFn);
            _onMoveFn = undefined;
            events.onDown(_onDown);
        }
        const _onMoveRight: mouseEventCallback = (evt) => {
            //log.info(evt);
            let _dX = evt.movementX * -.03;
            let _dY = evt.movementY * .03;
            //log.info(_dX, _dY);
            //this._spaceCtrl.rotateVertically(Utils.deg2Rad(_dX));
            if (evt.ctrlKey && evt.shiftKey) {
                let _dir = this._helperVec4_x.reset(-_dY, _dX, 0, 0);// perpedicular to {_dX,_dY};
                let _theta = _dir.magnitude();
                this._space.transformVec4(_dir, _dir).normalize();
                this.moveAround(this._rotateCenterPosition, _dir, _theta);
            } else if (evt.ctrlKey) {
                let _dir = this._helperVec4_x.reset(-_dY, 0, 0, 0);
                let _theta = _dir.magnitude();
                this._space.transformVec4(_dir, _dir).normalize();
                this.moveAround(this._rotateCenterPosition, _dir, _theta);
            } else {
                this.moveAround(this._rotateCenterPosition, Vec4.VEC4_0100, _dX);
            }
        }
        const _onMoveLeft: mouseEventCallback = (evt) => {
            //log.info(evt);
            let _dY = evt.movementX * .03;
            let _dX = evt.movementY * .03;
            this._helperVec4_y.reset(-_dY, 0, -_dX, 0);

            this._space.getAxisX(this._helperVec4_x).removeY().normalize();
            this._space.getAxisZ(this._helperVec4_z).removeY().normalize();
            this._helperMat44.setColumns(this._helperVec4_x, Vec4.VEC4_0100, this._helperVec4_z, Vec4.VEC4_0001).multiplyVec4(this._helperVec4_y, this._helperVec4_y);
            this.moveHorizontally(this._helperVec4_y.x, this._helperVec4_y.z);
        }
        /*
        events.onDBClick((evt) => {
            this.lookAt(Vec4.VEC4_0001);
        });
        */
        events.onWheel((evt) => {
            let delta = 0.5 * Math.sign((evt as WheelEvent).deltaY);
            this.moveForward(delta);
            //this._spaceCtrl.moveRight(delta);
            //this._spaceCtrl.moveUp(delta);
            //this._spaceCtrl.axisZPointsToVec(Vec4.VEC4_0001, false);
            //this._spaceCtrl.rotateAroundY(Utils.deg2Rad(delta*5));
        });
        events.onDown(_onDown);
        return this;
    }

    get viewMatrix(): roMat44 {
        return this._space.transformInv;
    }

    get viewProjectionMatrix(): roMat44 {
        return this._viewProjectionMatrix;
    }

    update(dt: number): void {
        if (this._cameraDirtyFlag) {
            this._frustum.projectionMatrix.multiply(this.viewMatrix, this._viewProjectionMatrix);
            this._UBO.uploadData(this._uboData);
            this._cameraDirtyFlag = false;
        }
    }

    setRotateCenter(posX: number, posY: number, posZ: number): Camera {
        this._rotateCenterPosition.reset(posX, posY, posZ, 1.0);
        return this;
    }

    setPosition(posX: number, posY: number, posZ: number): Camera {
        this._space.setPosition(posX, posY, posZ);
        this._cameraDirtyFlag = true;
        return this;
    }

    setFrustum(frustum: Frustum): Camera {
        this._frustum = frustum;
        return this;
    }

    moveHorizontally(deltaX: number, delta: number): Camera {
        this._spaceCtrl.moveHorizontally(deltaX, delta);
        this._cameraDirtyFlag = true;
        return this;
    }

    moveForward(delta: number): Camera {
        this._spaceCtrl.moveForward(delta);
        this._cameraDirtyFlag = true;
        return this;
    }

    moveAround(pos: xyzw, dir_normalized: xyzw, theta: number): Camera {
        this._spaceCtrl.rotateAround(pos, dir_normalized, theta);
        this._cameraDirtyFlag = true;
        return this;
    }

    lookAt(pos: xyzw): Camera {
        this._spaceCtrl.axisZPointsToVec(pos, false);
        this._cameraDirtyFlag = true;
        return this;
    }
}

