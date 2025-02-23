if (!CG.Vec4) CG.vital("math.js file should be loaded first!");

/**
* controller interacts with 3d spaces, so, every space should implement a interface like this:
*
* transform(subspace_mat44);
* setPosition(x, y, z);
* setAxisZ(x, y, z);
* setAxisX(x, y, z);
* setAxisY(x, y, z);
*
* these are base infomations of a frame.
*/

class SpaceController {
    #_helperQuat = new CG.Quat();
    #_helperQuatConj = new CG.Quat();
    #_helperQuatTemp = new CG.Quat();
    #_helperMat44 = new CG.Mat44();
    #_helperMat44Temp = new CG.Mat44();
    #_helperVec4_x = new CG.Vec4();
    #_helperVec4_y = new CG.Vec4();
    #_helperVec4_z = new CG.Vec4();
    #_helperVec4_w = new CG.Vec4();
    #_space;
    constructor(space) {
        this.setSpace(space);
    }
    setSpace(space) {
        this.#_space = space;
    }

    /**
    * move to x-postive direction;
    */
    moveRight(delta) {
        CG.Mat44.createTranslateX(delta, this.#_helperMat44);
        this.#_space.transform(this.#_helperMat44);
    }

    /**
    * move to y-postive direction;
    */
    moveUp(delta) {
        CG.Mat44.createTranslateY(delta, this.#_helperMat44);
        this.#_space.transform(this.#_helperMat44);
    }

    /**
    * move to z-postive direction;
    */
    moveForward(delta) {
        CG.Mat44.createTranslateZ(delta, this.#_helperMat44);
        this.#_space.transform(this.#_helperMat44);
    }

    createScaleOfX(delta) {
        CG.Mat44.createScaleOfX(delta, this.#_helperMat44);
        this.#_space.transform(this.#_helperMat44);
    }
    createScaleOfY(delta) {
        CG.Mat44.createScaleOfY(delta, this.#_helperMat44);
        this.#_space.transform(this.#_helperMat44);
    }
    createScaleOfZ(delta) {
        CG.Mat44.createScaleOfZ(delta, this.#_helperMat44);
        this.#_space.transform(this.#_helperMat44);
    }

    setPosition(posInParentSpace) {
        this.#_space.setPosition(posInParentSpace);
    }

    rotateAroundSelfX(delta) {
        CG.Mat44.createRotateAroundX(delta, this.#_helperMat44);
        this.#_space.transform(this.#_helperMat44);
    }
    rotateAroundSelfY(delta) {
        CG.Mat44.createRotateAroundY(delta, this.#_helperMat44);
        this.#_space.transform(this.#_helperMat44);
    }
    rotateAroundSelfZ(delta) {
        CG.Mat44.createRotateAroundZ(delta, this.#_helperMat44);
        this.#_space.transform(this.#_helperMat44);
    }

    /*
    * pos{Vec4}: parent space postion
    * point z-axis towards 'pos', and keeps y axis upward.
    */
    axisZPointsTo(pos, positive = true) {
        let _space = this.#_space;
        const _d = _space.getTransform(this.#_helperMat44)._dataArr32;
        if (pos.isSame(_d[12], _d[13], _d[14], _d[15])) return;

        let _x = this.#_helperVec4_x;
        let _y = this.#_helperVec4_y;
        let _z = this.#_helperVec4_z;
        _z.reset(_d[12], _d[13], _d[14], _d[15]).negate().addVec(pos).normalize();
        if (!positive) _z.negate();
        CG.Vec4.VEC4_0100.cross(_z, _x).removeY().removeW().normalize();
        _z.cross(_x, _y).normalize();
        _space.setAxisXYZVec(_x, _y, _z);
    }

    /**
     * deltaX,and deltaZ are both defined under world space
     * move this space origin that projected to parent's XOZ plane as (x,z) to new pos(x+deltaX, z+deltaZ);
     */
    moveHorizontally(deltaX, deltaZ) {
        const _space = this.#_space;
        let _w = this.#_helperVec4_w;
        _space.getPosition(_w).add(deltaX, 0, deltaZ, 0);
        _space.setPositionVec(_w);
    }

    rotateVertically(delta) {
        if (true) {
            //matrix version;
            const _m4 = this.#_helperMat44;
            CG.Mat44.createRotateAroundY(delta, _m4).multiplyLeftTop33(this.#_space.getTransform(this.#_helperMat44Temp), _m4);
            const _d = _m4._dataArr32;
            this.#_space.setAxisXYZ(_d[0], _d[1], _d[2], _d[4], _d[5], _d[6], _d[8], _d[9], _d[10]);
        } else {
            // quaternion version;
            let _q = new CG.Quat();
            this.#_space.transformationInv.multiplyVec4(CG.Vec4.VEC4_0100, this.#_helperVec4_y);
            this.#_helperQuatConj.copyFrom(CG.Quat.createRotateQuat(delta, this.#_helperVec4_y, this.#_helperQuat)).conjugate();
            this.#_helperQuat.multiply(CG.Vec4.VEC4_1000, _q).multiply(this.#_helperQuatConj, this.#_helperVec4_x);
            this.#_helperQuat.multiply(CG.Vec4.VEC4_0100, _q).multiply(this.#_helperQuatConj, this.#_helperVec4_y);
            this.#_helperQuat.multiply(CG.Vec4.VEC4_0010, _q).multiply(this.#_helperQuatConj, this.#_helperVec4_z);
            this.#_helperMat44.setWithColumns(this.#_helperVec4_x, this.#_helperVec4_y, this.#_helperVec4_z, Vec4.VEC4_0001);
            this.#_space.transform(this.#_helperMat44);
        }
    }

    /**
    * dirInParentSpace must be normalized
    */
    rotateAround(posInParentSpace, dirInParentSpace, delta) {
        let _x = this.#_helperVec4_x;
        let _y = this.#_helperVec4_y;
        let _z = this.#_helperVec4_z;
        let _w = this.#_helperVec4_w.copyFrom(posInParentSpace).negate().addVec(this.#_space.getPosition(_x));
        this.#_space.getAxisX(_x).addVec(_w);
        this.#_space.getAxisY(_y).addVec(_w);
        this.#_space.getAxisZ(_z).addVec(_w);

        let _q = this.#_helperQuatTemp;
        let _qR = this.#_helperQuat;
        let _qRInv = this.#_helperQuatConj;
        _qRInv.copyFrom(CG.Quat.createRotateQuat(delta, dirInParentSpace, _qR)).conjugate();
        _qR.multiply(_w, _q).multiply(_qRInv, _w);
        _qR.multiply(_x, _q).multiply(_qRInv, _x);
        _qR.multiply(_y, _q).multiply(_qRInv, _y);
        _qR.multiply(_z, _q).multiply(_qRInv, _z);

        _w.negate();
        this.#_space.setAxisXYZVec(_x.addVec(_w).normalize(), _y.addVec(_w).normalize(), _z.addVec(_w).normalize());
        this.#_space.setPositionVec(_w.negate().addVec(posInParentSpace));
    }
}

window.CG ??= {};
window.CG.SpaceController = Object.freeze(SpaceController);

console.log('[space-controller.js] loaded.');
