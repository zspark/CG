import OrthogonalSpace from "./orthogonal-space.js"
import { xyzw, Vec4 } from "./math.js"

export interface ILight extends OrthogonalSpace {
    setColor(r: number, g: number, b: number): void;
    color: xyzw;
    setDirection(x: number, y: number, z: number): void;
    direction: xyzw;
    update(dt: number): void;
    setAngle(value: number): void;
    angle: number;
    setCutoffDistance(value: number): void;
    cutoffDistance: number;
};

class PointLight extends OrthogonalSpace implements ILight {
    private _color = new Vec4(1, 1, 1, 1);
    constructor(posX: number, posY: number, posZ: number) {
        super();
        super.setPosition(posX, posY, posZ);
    }
    setColor(r: number, g: number, b: number): void {
        this._color.reset(r, g, b, 10);
    }
    get color(): xyzw { return this._color; }
    setDirection(x: number, y: number, z: number): void { }
    get direction(): xyzw { return Vec4.VEC4_0000; }
    setAngle(value: number): void { }
    get angle(): number { return 0; }
    setCutoffDistance(value: number): void { }
    get cutoffDistance(): number { return 0 }

    update(dt: number) { }
}

class ParallelLight extends OrthogonalSpace implements ILight {
    private _color = new Vec4(1, 1, 1, 1);
    private _dir = new Vec4(0, -1, 0);
    constructor(posX: number, posY: number, posZ: number) {
        super();
        super.setPosition(posX, posY, posZ);
    }
    setColor(r: number, g: number, b: number): void {
        this._color.reset(r, g, b, 10);
    }
    get color(): xyzw { return this._color; }

    setDirection(x: number, y: number, z: number) {
        this._dir.reset(x, y, z, 0.0);
        return this;
    }
    get direction(): xyzw {
        return this._dir;
    }
    setAngle(value: number): void { }
    get angle(): number { return 0; }
    setCutoffDistance(value: number): void { }
    get cutoffDistance(): number { return 0 }

    update(dt: number) { }
}

class SpotLight extends OrthogonalSpace implements ILight {
    private _color = new Vec4(1, 1, 1, 1);
    private _dir = new Vec4(0, -1, 0);
    private _cutoffDis = 100;
    private _angle = Math.PI / 6;
    constructor(posX: number, posY: number, posZ: number) {
        super();
        super.setPosition(posX, posY, posZ);
    }
    setColor(r: number, g: number, b: number): void {
        this._color.reset(r, g, b, 10);
    }
    get color(): xyzw { return this._color; }

    setDirection(x: number, y: number, z: number) {
        this._dir.reset(x, y, z, 0.0);
    }
    get direction(): xyzw { return this._dir; }

    setAngle(value: number): void {
        this._angle = value;
    }
    get angle(): number { return this._angle; }

    setCutoffDistance(value: number): void {
        this._cutoffDis = value;
    }
    get cutoffDistance(): number { return this._cutoffDis; }

    update(dt: number) { }
}


export default { PointLight, ParallelLight, SpotLight }
