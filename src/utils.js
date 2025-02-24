if (!CG.Vec4) CG.vital("math.js file should be loaded first!");
window.CG ??= {};
(function () {


    window.CG.Utils = Object.freeze({
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
