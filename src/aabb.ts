import { Vec4, xyzw } from "./math.js"

export default class AABB {

    private _data = new Float32Array(12);
    private _min: Vec4;
    private _max: Vec4;
    private _center: Vec4;

    constructor() {
        this._min = new Vec4(0, 0, 0, 1, this._data, 0);
        this._max = new Vec4(0, 0, 0, 1, this._data, 4);
        this._center = new Vec4(0, 0, 0, 1, this._data, 8);
        this.reset();
    }

    get min(): xyzw {
        return this._min;
    }

    get max(): xyzw {
        return this._max;
    }

    get center(): xyzw {
        return this._center;
    }

    reset(): AABB {
        this._min.reset(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 1);
        this._max.reset(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, 1);
        this._center.reset(0, 0, 0, 1);
        return this;
    }

    append(aabb: AABB): AABB {
        this._min.x = Math.min(this._min.x, aabb.min.x);
        this._min.y = Math.min(this._min.y, aabb.min.y);
        this._min.z = Math.min(this._min.z, aabb.min.z);
        this._max.x = Math.max(this._max.x, aabb.max.x);
        this._max.y = Math.max(this._max.y, aabb.max.y);
        this._max.z = Math.max(this._max.z, aabb.max.z);
        this._center.copyFrom(this._min).addVec(this._max).multiply(.5);
        return this;
    }

    setMin(x: number, y: number, z: number): AABB {
        this._min.reset(x, y, z, 1);
        this._center.copyFrom(this._min).addVec(this._max).multiply(.5);
        return this;
    }

    setMax(x: number, y: number, z: number): AABB {
        this._max.reset(x, y, z, 1);
        this._center.copyFrom(this._min).addVec(this._max).multiply(.5);
        return this;
    }
}

