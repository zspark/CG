import log from "./log.js"
import { Mat44, Vec4 } from "./math.js"

export default class Frustum {
    static FRUSTUM_PERSPECTIVE: number = 1;
    static FRUSTUM_ORTHOGONAL: number = 2;

    private _transformMatrix = new Mat44().setIdentity();
    constructor() { }

    get projectionMatrix() {
        return this._transformMatrix;
    }

    createOrthogonalProjection(left: number, right: number, bottom: number, top: number, near: number, far: number, rightHanded: boolean = true): Frustum {
        if (right <= left || top <= bottom || far <= near) log.vital("[frustum] 'right' should bigger than 'left' and the same with others");
        this._transformMatrix.reset(new Float32Array([2 / (right - left), 0, 0, -(left + right) / (right - left),
            0, 2 / (top - bottom), 0, -(bottom + top) / (top - bottom),
            0, 0, (rightHanded ? -1 : 1) * 2 / (far - near), -(near + far) / (far - near),
            0, 0, 0, 1]), 0, 16).transpose();
        return this;
    }

    createPerspectiveProjection(Hfov: number, aspectRatio: number, near: number, far: number, rightHanded: boolean = true): Frustum {
        if (Hfov <= 0) log.vital("[frustum] 'Hfov' must biggner than 0");
        if (aspectRatio <= 0) log.vital("[frustum] 'aspectRatio' must biggner than 0");
        if (near <= 0 || far <= near) log.vital("[frustum] 'far' and 'near' should bigger than 0, and 'far' must bigger than 'near'");
        let Vfov = Hfov / aspectRatio;
        this._transformMatrix.reset(new Float32Array([1.0 / Math.tan(Hfov * .5), 0, 0, 0,
            0, 1.0 / Math.tan(Vfov * .5), 0, 0,
            0, 0, (rightHanded ? -1 : 1) * (far + near) / (far - near), -2 * far * near / (far - near),
            0, 0, (rightHanded ? -1 : 1) * 1, 0]), 0, 16).transpose();
        return this;
    }
}


