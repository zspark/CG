import log from "./log.js"
import { Mat44, Vec4 } from "./math.js"

export enum ProjectionType_e {
    PERSPECTIVE = 1,
    ORTHOGONAL = 2,
};

export default class Frustum {

    private _type: ProjectionType_e;
    private _projectionMatrix: Mat44;
    private _pInvMatrix: Mat44;
    private _data = new Float32Array(24 * 3);// 24 vertices

    constructor(storage?: Float32Array, index?: number) {
        this._projectionMatrix = new Mat44(storage, index).setIdentity();
        this._pInvMatrix = new Mat44(storage, index + 16).setIdentity();
    }

    get projectionMatrix() {
        return this._projectionMatrix;
    }

    get type(): ProjectionType_e {
        return this._type;
    }

    get debugData(): Float32Array {
        return this._data;
    }

    createOrthogonalProjection(left: number, right: number, bottom: number, top: number, near: number, far: number, rightHanded: boolean = true): Frustum {
        if (right <= left || top <= bottom || far <= near) log.vital("[frustum] 'right' should bigger than 'left' and the same with others");
        this._type = ProjectionType_e.ORTHOGONAL;
        this._projectionMatrix.reset(new Float32Array([2 / (right - left), 0, 0, -(left + right) / (right - left),
            0, 2 / (top - bottom), 0, -(bottom + top) / (top - bottom),
            0, 0, (rightHanded ? -1 : 1) * 2 / (far - near), -(near + far) / (far - near),
            0, 0, 0, 1]), 0, 16).transpose();

        this._pInvMatrix.copyFrom(this._projectionMatrix).invert();
        return this;
    }

    createPerspectiveProjection(Hfov: number, aspectRatio: number, near: number, far: number, rightHanded: boolean = true): Frustum {
        if (Hfov <= 0) log.vital("[frustum] 'Hfov' must biggner than 0");
        if (aspectRatio <= 0) log.vital("[frustum] 'aspectRatio' must biggner than 0");
        if (near <= 0 || far <= near) log.vital("[frustum] 'far' and 'near' should bigger than 0, and 'far' must bigger than 'near'");
        this._type = ProjectionType_e.PERSPECTIVE;
        let Vfov = Hfov / aspectRatio;
        Mat44.createPerspectiveProjection(this._projectionMatrix, Hfov, aspectRatio, near, far, rightHanded);
        this._pInvMatrix.copyFrom(this._projectionMatrix).invert();

        const _nX = Math.tan(Hfov * .5) * near;
        const _nY = Math.tan(Vfov * .5) * near;
        const _fX = Math.tan(Hfov * .5) * far;
        const _fY = Math.tan(Vfov * .5) * far;
        this._data.set([
            -_nX, -_nY, -near, -_nX, _nY, -near,
            -_nX, _nY, -near, _nX, _nY, -near,
            _nX, _nY, -near, _nX, -_nY, -near,
            _nX, -_nY, -near, -_nX, -_nY, -near,

            -_fX, -_fY, -far, -_fX, _fY, -far,
            -_fX, _fY, -far, _fX, _fY, -far,
            _fX, _fY, -far, _fX, -_fY, -far,
            _fX, -_fY, -far, -_fX, -_fY, -far,

            0, 0, 0, -_fX, -_fY, -far,
            0, 0, 0, -_fX, _fY, -far,
            0, 0, 0, _fX, _fY, -far,
            0, 0, 0, _fX, -_fY, -far,
        ]);

        return this;
    }

}


