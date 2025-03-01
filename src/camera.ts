import log from "./log.js"
import { xyzw, roMat44, Mat44, Vec4 } from "./math.js"
import OrthogonalSpace from "./orthogonal-space.js"
import Frustum from "./frustum.js"
import SpaceController from "./space-controller.js"
import { mouseEvents, mouseEventCallback } from "./mouse-events.js"

export interface ICamera {
    position: xyzw;

    setMouseEvents(events: mouseEvents): Camera;
    viewMatrix: roMat44;
    viewProjectionMatrix: roMat44;
    update(dt: number): void;

    setFrustum(frustum: Frustum): Camera
    moveHorizontally(deltaX: number, delta: number): Camera
    moveAround(pos: xyzw, dir_normalized: xyzw, theta: number): Camera;
    /**
    * pos must be defined under world coordinate
    */
    lookAt(pos: xyzw): Camera
};

export default class Camera implements ICamera {
    private _helperMat44 = new Mat44();
    private _helperVec4_x = new Vec4();
    private _helperVec4_y = new Vec4();
    private _helperVec4_z = new Vec4();
    private _spaceCtrl: SpaceController;
    private _space: OrthogonalSpace;
    private _viewProjectionMatrix = new Mat44().setIdentity();
    private _frustum = new Frustum();

    constructor(posX: number, posY: number, posZ: number) {
        this._space = new OrthogonalSpace();
        this._space.setPosition(posX, posY, posZ);
        this._spaceCtrl = new SpaceController(this._space);
    }

    get position(): xyzw {
        return this._space.getPosition(this._helperVec4_z);
    }

    setMouseEvents(events: mouseEvents): Camera {
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
                this.moveAround(Vec4.VEC4_0000, _dir, _theta);
            } else if (evt.ctrlKey) {
                let _dir = this._helperVec4_x.reset(-_dY, 0, 0, 0);
                let _theta = _dir.magnitude();
                this._space.transformVec4(_dir, _dir).normalize();
                this.moveAround(Vec4.VEC4_0000, _dir, _theta);
            } else {
                this.moveAround(Vec4.VEC4_0000, Vec4.VEC4_0100, _dX);
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
        events.onDBClick((evt) => {
            this.lookAt(Vec4.VEC4_0001);
        });
        events.onWheel((evt) => {
            let delta = 0.5 * Math.sign((evt as WheelEvent).deltaY);
            this._spaceCtrl.moveForward(delta);
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
        this._frustum.projectionMatrix.multiply(this.viewMatrix, this._viewProjectionMatrix);
    }

    setPosition(posX: number, posY: number, posZ: number): Camera {
        this._space.setPosition(posX, posY, posZ);
        return this;
    }

    setFrustum(frustum: Frustum): Camera {
        this._frustum = frustum;
        return this;
    }

    moveHorizontally(deltaX: number, delta: number): Camera {
        this._spaceCtrl.moveHorizontally(deltaX, delta);
        return this;
    }

    moveAround(pos: xyzw, dir_normalized: xyzw, theta: number): Camera {
        this._spaceCtrl.rotateAround(pos, dir_normalized, theta);
        return this;
    }

    lookAt(pos: xyzw): Camera {
        this._spaceCtrl.axisZPointsToVec(pos, false);
        return this;
    }
}

