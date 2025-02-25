if (!CG.Vec4) CG.vital("math.js file should be loaded first!");
window.CG ??= {};

(function () {

    class Light extends CG.OrthogonalSpace {
        #_color = new CG.Vec4(1, 1, 1, 1);
        constructor(posX, posY, posZ) {
            super()
            super.setPosition(posX, posY, posZ);
        }

        setColor(r, g, b) {
            this.#_color.reset(r, g, b);
            return this;
        }

        get color() {
            return this.#_color;
        }

        update(dt) { }
    }

    class PointLight extends Light {
        constructor(posX, posY, posZ) {
            super(posX, posY, posZ)
        }

        update(dt) { }
    }

    class ParallelLight extends Light {
        #_dir = new CG.Vec3(0, -1, 0);
        constructor(posX, posY, posZ) {
            super(posX, posY, posZ)
        }

        setDirection(x, y, z) {
            this.#_dir.reset(x, y, z, 0.0);
            return this;
        }
        get direction() {
            return this.#_dir;
        }
        update(dt) { }
    }

    class SpotLight extends ParallelLight {
        #_cutoffDis = 100;
        #_angle = Math.PI / 6;
        constructor(posX, posY, posZ) {
            super(posX, posY, posZ)
        }

        setAngle(value) {
            this.#_angle = value;
            return this;
        }
        get angle() {
            return this.#_angle;
        }

        setCutoffDistance(value) {
            this.#_cutoffDis = value;
            return this;
        }
        get cutoffDistance() {
            return this.#_cutoffDis;
        }

        update(dt) { }
    }

    window.CG.Light = Object.freeze({
        PointLight,
        ParallelLight,
        SpotLight,
    });
    CG.info('[light-source.js] loaded.');
})()

