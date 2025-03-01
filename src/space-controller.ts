import log from "./log.js"
import { xyzw, Mat44, Vec4, Quat } from "./math.js"
import OrthogonalSpace from "./orthogonal-space.js"



/**
* controller interacts with 3d spaces, so, every space should implement a interface like this:
* these are base infomations of a frame.
*/

export default class SpaceController {
    private _helperQuatProxy = new Quat();
    private _data: Float32Array = new Float32Array(12).fill(0);
    private _helperQuat = new Quat(this._data, 0, 4);
    private _helperQuatConj = new Quat(this._data, 4, 8);
    private _helperQuatTemp = new Quat(this._data, 8, 12);
    private _helperMat44 = new Mat44();
    private _helperVec4_x = new Vec4();
    private _helperVec4_y = new Vec4();
    private _helperVec4_z = new Vec4();
    private _helperVec4_w = new Vec4();
    private _space: OrthogonalSpace;

    constructor(space?: OrthogonalSpace) {
        this.setSpace(space);
    }
    setSpace(space: OrthogonalSpace): SpaceController {
        this._space = space;
        return this;
    }

    /**
    * move to x-postive direction;
    */
    moveRight(delta: number): SpaceController {
        Mat44.createTranslateX(delta, this._helperMat44);
        this._space.transformSelf(this._helperMat44);
        return this;
    }

    /**
    * move to y-postive direction;
    */
    moveUp(delta: number): SpaceController {
        Mat44.createTranslateY(delta, this._helperMat44);
        this._space.transformSelf(this._helperMat44);
        return this;
    }

    /**
    * move to z-postive direction;
    */
    moveForward(delta: number): SpaceController {
        Mat44.createTranslateZ(delta, this._helperMat44);
        this._space.transformSelf(this._helperMat44);
        return this;
    }

    scale(scaleX: number, scaleY: number, scaleZ: number): SpaceController {
        Mat44.createScale(scaleX, scaleY, scaleZ, this._helperMat44);
        this._space.transformSelf(this._helperMat44);
        return this;
    }

    setPositionVec(posInParentSpace: xyzw): SpaceController {
        this._space.setPositionVec(posInParentSpace);
        return this;
    }
    setPosition(x: number, y: number, z: number): SpaceController {
        this._space.setPosition(x, y, z);
        return this;
    }

    rotateAroundSelfX(delta: number): SpaceController {
        Mat44.createRotateAroundX(delta, this._helperMat44);
        this._space.transformSelf(this._helperMat44);
        return this;
    }
    rotateAroundSelfY(delta: number): SpaceController {
        Mat44.createRotateAroundY(delta, this._helperMat44);
        this._space.transformSelf(this._helperMat44);
        return this;
    }
    rotateAroundSelfZ(delta: number): SpaceController {
        Mat44.createRotateAroundZ(delta, this._helperMat44);
        this._space.transformSelf(this._helperMat44);
        return this;
    }

    axisZPointsTo(x: number, y: number, z: number, positive: boolean = true): SpaceController {
        return this.axisZPointsToVec(this._helperVec4_w.reset(x, y, z, 1.0), positive);
    }
    /*
    * point z-axis towards 'pos', and keeps y axis upward.
    * pos should be in parent space;
    */
    axisZPointsToVec(pos: xyzw, positive: boolean = true): SpaceController {
        let _space = this._space;
        const _d = _space.transform.data;
        if (pos.isSame(_d[12], _d[13], _d[14], _d[15])) return this;

        let _x = this._helperVec4_x;
        let _y = this._helperVec4_y;
        let _z = this._helperVec4_z;
        _z.reset(_d[12], _d[13], _d[14], _d[15]).negate().addVec(pos).normalize();
        if (!positive) _z.negate();
        if (Vec4.VEC4_0100.cross(_z, _x).isSameVec(Vec4.VEC4_0000)) {
            log.warn("[space-controller] two axises are parallel, cancel 'axisZPointsToVec() from executing!");
        } else {
            _x.removeY().removeW().normalize();
            _z.cross(_x, _y).normalize();
            _space.setAxisXYZVec(_x, _y, _z);
        }
        return this;
    }

    /**
     * deltaX,and deltaZ are both defined under world space
     * move this space origin that projected to parent's XOZ plane as (x,z) to new pos(x+deltaX, z+deltaZ);
     */
    moveHorizontally(deltaX: number, deltaZ: number): SpaceController {
        const _space = this._space;
        let _w = this._helperVec4_w;
        _space.getPosition(_w).add(deltaX, 0, deltaZ, 0);
        _space.setPositionVec(_w);
        return this;
    }

    rotateVertically(delta: number): SpaceController {
        //matrix version;
        const _m4 = this._helperMat44;
        Mat44.createRotateAroundY(delta, _m4).multiplyLeftTop33(this._space.transform, _m4);
        const _d = _m4.data;
        this._space.setAxisXYZ(_d[0], _d[1], _d[2], _d[4], _d[5], _d[6], _d[8], _d[9], _d[10]);
        return this;
    }

    /**
    * dirInParentSpace must be normalized
    */
    rotateAround(posInParentSpace: xyzw, dirInParentSpace: xyzw, delta: number): SpaceController {
        let _x = this._helperVec4_x;
        let _y = this._helperVec4_y;
        let _z = this._helperVec4_z;
        let _w = this._helperVec4_w.copyFrom(posInParentSpace).negate().addVec(this._space.getPosition(_x));
        this._space.getAxisX(_x).addVec(_w);
        this._space.getAxisY(_y).addVec(_w);
        this._space.getAxisZ(_z).addVec(_w);

        let _q = this._helperQuatTemp;
        let _qR = this._helperQuat;
        let _qRInv = this._helperQuatConj;
        _qRInv.copyFrom(Quat.createRotateQuat(delta, dirInParentSpace, _qR)).conjugate();

        let _qp = this._helperQuatProxy;
        _qR.multiply(_qp.shareVec4(_w), _q).multiply(_qRInv, _qp);
        _qR.multiply(_qp.shareVec4(_x), _q).multiply(_qRInv, _qp);
        _qR.multiply(_qp.shareVec4(_y), _q).multiply(_qRInv, _qp);
        _qR.multiply(_qp.shareVec4(_z), _q).multiply(_qRInv, _qp);

        _w.negate();
        this._space.setAxisXYZVec(_x.addVec(_w).normalize(), _y.addVec(_w).normalize(), _z.addVec(_w).normalize());
        this._space.setPositionVec(_w.negate().addVec(posInParentSpace));
        return this;
    }
}
