import OrthogonalSpace from "./orthogonal-space.js"
import { xyzw, Vec4 } from "./math.js"

class Light extends OrthogonalSpace {
    private _color = new Vec4(1, 1, 1, 1);

    constructor(posX: number, posY: number, posZ: number) {
        super()
        super.setPosition(posX, posY, posZ);
    }

    setColor(r: number, g: number, b: number) {
        this._color.reset(r, g, b, 10);
        return this;
    }

    get color(): xyzw {
        return this._color;
    }

    update(dt: number) { }
}

class PointLight extends Light {
    constructor(posX: number, posY: number, posZ: number) {
        super(posX, posY, posZ)
    }

    update(dt: number) { }
}

class ParallelLight extends Light {
    private _dir = new Vec4(0, -1, 0);
    constructor(posX: number, posY: number, posZ: number) {
        super(posX, posY, posZ)
    }

    setDirection(x: number, y: number, z: number) {
        this._dir.reset(x, y, z, 0.0);
        return this;
    }
    get direction() {
        return this._dir;
    }
    update(dt: number) { }
}

class SpotLight extends ParallelLight {
    private _cutoffDis = 100;
    private _angle = Math.PI / 6;
    constructor(posX: number, posY: number, posZ: number) {
        super(posX, posY, posZ)
    }

    setAngle(value: number) {
        this._angle = value;
        return this;
    }
    get angle() {
        return this._angle;
    }

    setCutoffDistance(value: number) {
        this._cutoffDis = value;
        return this;
    }
    get cutoffDistance() {
        return this._cutoffDis;
    }

    update(dt: number) { }
}


export default { PointLight, ParallelLight, SpotLight }
