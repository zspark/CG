
function deg2Rad(deg: number): number {
    return deg * Math.PI / 180;
};

function rad2Deg(rad: number): number {
    return rad * 180 / Math.PI;
};

function numberSame(a: number, b: number, epsilon: number = 0.00001): boolean {
    return Math.abs(a - b) < epsilon;
};

export default { deg2Rad, rad2Deg, numberSame };
