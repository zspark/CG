if (!CG.Vec4) CG.vital("math.js file should be loaded first!");

/**
* we use right handed system.
*/
class OrthogonalSpace {
    static PLANE_ZOX = Object.freeze(1);
    static PLANE_XOY = Object.freeze(2);
    static PLANE_YOZ = Object.freeze(3);

    #_invMatDirty = false;
    #_transformationInv = new Mat44();
    #_transformation = new Mat44();

    constructor() {
        this.#_transformation.setToIdentity();
        this.#_transformationInv.setToIdentity();
    }

    get transformation() {
        return this.#_transformation;
    }
    get transformationInv() {
        if (this.#_invMatDirty) {
            this.#_transformationInv.copyFrom(this.#_transformation).invert();
            this.#_invMatDirty = false;
        }
        return this.#_transformationInv;
    }
    getAxisXProjectedToParent(plane, outVec4, doNormalize = true) {
        const _d = this.transformation._dataArr32;
        outVec4 ??= new Vec4();
        switch (plane) {
            case OrthogonalSpace.PLANE_XOY:
                outVec4.reset(_d[0], _d[1], 0, 0);
                break;
            case OrthogonalSpace.PLANE_YOZ:
                outVec4.reset(0, _d[1], _d[2], 0);
                break;
            case OrthogonalSpace.PLANE_ZOX:
            default:
                outVec4.reset(_d[0], 0, _d[2], 0);
                break;
        }
        return doNormalize ? outVec4.normalize() : outVec4;
    }
    getAxisYProjectedToParent(plane, outVec4, doNormalize = true) {
        const _d = this.transformation._dataArr32;
        outVec4 ??= new Vec4();
        switch (plane) {
            case OrthogonalSpace.PLANE_XOY:
                outVec4.reset(_d[4], _d[5], 0, 0);
                break;
            case OrthogonalSpace.PLANE_YOZ:
                outVec4.reset(0, _d[5], _d[6], 0);
                break;
            case OrthogonalSpace.PLANE_ZOX:
            default:
                outVec4.reset(_d[4], 0, _d[6], 0);
                break;
        }
        return doNormalize ? outVec4.normalize() : outVec4;
    }
    getAxisZProjectedToParent(plane, outVec4, doNormalize = true) {
        const _d = this.transformation._dataArr32;
        outVec4 ??= new Vec4();
        switch (plane) {
            case OrthogonalSpace.PLANE_XOY:
                outVec4.reset(_d[8], _d[9], 0, 0);
                break;
            case OrthogonalSpace.PLANE_YOZ:
                outVec4.reset(0, _d[9], _d[10], 0);
                break;
            case OrthogonalSpace.PLANE_ZOX:
            default:
                outVec4.reset(_d[8], 0, _d[10], 0);
                break;
        }
        return doNormalize ? outVec4.normalize() : outVec4;
    }
    transform(mat44) {
        this.#_transformation.multiply(mat44, this.#_transformation);
        this.#_invMatDirty = true;
        return this;
    }
    getPosition(outVec4) {
        return outVec4.reset(this.#_transformation._dataArr32[12],
            this.#_transformation._dataArr32[13],
            this.#_transformation._dataArr32[14],
            this.#_transformation._dataArr32[15]);
    }
    setPositionVec(vec4) {
        return this.setPosition(vec4.x, vec4.y, vec4.z, vec4.w);
    }
    setPosition(x, y, z) {
        this.#_transformation._dataArr32[12] = x;
        this.#_transformation._dataArr32[13] = y;
        this.#_transformation._dataArr32[14] = z;
        this.#_transformation._dataArr32[15] = 1;
        this.#_invMatDirty = true;
        return this;
    }
    setAxisX(x, y, z) {
        this.#_transformation._dataArr32[1] = x;
        this.#_transformation._dataArr32[2] = y;
        this.#_transformation._dataArr32[3] = z;
        this.#_transformation._dataArr32[4] = 0;
        this.#_invMatDirty = true;
        return this;
    }
    setAxisY(x, y, z) {
        this.#_transformation._dataArr32[4] = x;
        this.#_transformation._dataArr32[5] = y;
        this.#_transformation._dataArr32[6] = z;
        this.#_transformation._dataArr32[7] = 0;
        this.#_invMatDirty = true;
        return this;
    }
    setAxisZ(x, y, z) {
        this.#_transformation._dataArr32[8] = x;
        this.#_transformation._dataArr32[9] = y;
        this.#_transformation._dataArr32[10] = z;
        this.#_transformation._dataArr32[11] = 0;
        this.#_invMatDirty = true;
        return this;
    }
}

window.CG ??= {};
window.CG.OrthogonalSpace = OrthogonalSpace;

console.log('[orthogonal-space.js] loaded.');
