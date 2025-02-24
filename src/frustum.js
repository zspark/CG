if (!CG.Vec4) CG.vital("math.js file should be loaded first!");
window.CG ??= {};


(function () {

    class Frustum {
        static FRUSTUM_PERSPECTIVE = 1;
        static FRUSTUM_ORTHOGONAL = 2;

        #_transformMatrix = new CG.Mat44().setToIdentity();
        constructor() { }

        get projectionMatrix() {
            return this.#_transformMatrix;
        }

        createOrthogonalProjection(left, right, bottom, top, near, far, rightHanded = true) {
            if (right <= left || top <= bottom || far <= near) CG.vital("[frustum] 'right' should bigger than 'left' and the same with others");
            this.#_transformMatrix.reset([2 / (right - left), 0, 0, -(left + right) / (right - left),
                0, 2 / (top - bottom), 0, -(bottom + top) / (top - bottom),
                0, 0, (rightHanded ? -1 : 1) * 2 / (far - near), -(near + far) / (far - near),
                0, 0, 0, 1]);
            return this;
        }

        createPerspectiveProjection(Hfov, aspectRatio, near, far, rightHanded = true) {
            if (Hfov <= 0) CG.vital("[frustum] 'Hfov' must biggner than 0");
            if (aspectRatio <= 0) CG.vital("[frustum] 'aspectRatio' must biggner than 0");
            if (near <= 0 || far <= near) CG.vital("[frustum] 'far' and 'near' should bigger than 0, and 'far' must bigger than 'near'");
            let Vfov = Hfov / aspectRatio;
            this.#_transformMatrix.reset([1.0 / Math.tan(Hfov * .5), 0, 0, 0,
                0, 1.0 / Math.tan(Vfov * .5), 0, 0,
                0, 0, (rightHanded ? -1 : 1) * (far + near) / (far - near), -2 * far * near / (far - near),
                0, 0, (rightHanded ? -1 : 1) * 1, 0]);
            return this;
        }
    }

    window.CG.Frustum = Frustum;


    CG.info('[frustum.js] loaded.');
})()
