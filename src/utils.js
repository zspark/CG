if (!CG.Vec4) CG.vital("math.js file should be loaded first!");
window.CG ??= {};
(function () {

    function createPerspectiveMatrix(Hfov, aspectRatio, near, far, rightHanded = true) {
        if (Hfov <= 0) CG.vital("[utils] 'Hfov' must biggner than 0");
        if (aspectRatio <= 0) CG.vital("[utils] 'aspectRatio' must biggner than 0");
        if (near <= 0 || far <= near) CG.vital("[utils] 'far' and 'near' should bigger than 0, and 'far' must bigger than 'near'");
        let Vfov = Hfov / aspectRatio;
        return new CG.Mat44().reset([1.0 / Math.tan(Hfov * .5), 0, 0, 0,
            0, 1.0 / Math.tan(Vfov * .5), 0, 0,
            0, 0, (rightHanded ? -1 : 1) * (far + near) / (far - near), -2 * far * near / (far - near),
            0, 0, (rightHanded ? -1 : 1) * 1, 0]);
    }


    function createOrthogonalMatrix(left, right, bottom, top, near, far, rightHanded = true) {
        if (right <= left || top <= bottom || far <= near) CG.vital("[utils] 'right' should bigger than 'left' and the same with others");
        return new CG.Mat44().reset([2 / (right - left), 0, 0, -(left + right) / (right - left),
            0, 2 / (top - bottom), 0, -(bottom + top) / (top - bottom),
            0, 0, (rightHanded ? -1 : 1) * 2 / (far - near), -(near + far) / (far - near),
            0, 0, 0, 1]);
    }

    window.CG.Utils = Object.freeze({
        createPerspectiveMatrix,
        createOrthogonalMatrix,
        deg2Rad: (deg) => {
            return deg * Math.PI / 180;
        },
        rad2Deg: (rad) => {
            return rad * 180 / Math.PI;
        },
        numberSame: (a, b, epsilon = 0.00001) => {
            return Math.abs(a - b) < epsilon;
        }
    });

    CG.info('[utils.js] loaded.');
})()
