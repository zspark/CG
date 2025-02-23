if (!CG.Vec4) CG.vital("math.js file should be loaded first!");

class Camera {
    #_helperMat44 = new CG.Mat44();
    #_helperVec4_x = new CG.Vec4();
    #_helperVec4_y = new CG.Vec4();
    #_helperVec4_z = new CG.Vec4();
    #_mouseEvents;
    #_spaceCtrl;
    #_space;

    constructor(posX, posY, posZ, events) {
        this.#_space = new CG.OrthogonalSpace().setPosition(posX, posY, posZ);
        this._mouseEvents = events;
        this.#_spaceCtrl = new CG.SpaceController(this.#_space);

        let _onMoveFn;
        const _onDown = (evt) => {
            //CG.info(evt);
            events.offDown(_onDown);
            events.onUp(_onUp);
            /*
             * 0: Left mouse button
             * 1: Middle mouse button (or wheel button)
             * 2: Right mouse button
            */
            _onMoveFn = evt.button === 0 ? _onMoveLeft : _onMoveRight;
            events.onMove(_onMoveFn);
        };
        const _onUp = (evt) => {
            events.offUp(_onUp);
            events.offMove(_onMoveFn);
            _onMoveFn = undefined;
            events.onDown(_onDown);
        }
        const _onMoveRight = (evt) => {
            //CG.info(evt);
            let _dX = evt.movementX * -.03;
            let _dY = evt.movementY * .03;
            //CG.info(_dX, _dY);
            //this.#_spaceCtrl.rotateVertically(CG.Utils.deg2Rad(_dX));
            if (evt.ctrlKey && evt.shiftKey) {
                let _dir = this.#_helperVec4_x.reset(-_dY, _dX, 0, 0);// perpedicular to {_dX,_dY};
                let _theta = _dir.magnitude();
                this.#_space.transformVec4(_dir, _dir).normalize();
                this.moveAround(CG.Vec4.VEC4_0000, _dir, _theta);
            } else if (evt.ctrlKey) {
                let _dir = this.#_helperVec4_x.reset(-_dY, 0, 0, 0);
                let _theta = _dir.magnitude();
                this.#_space.transformVec4(_dir, _dir).normalize();
                this.moveAround(CG.Vec4.VEC4_0000, _dir, _theta);
            } else {
                this.moveAround(CG.Vec4.VEC4_0000, CG.Vec4.VEC4_0100, _dX);
            }
        }
        const _onMoveLeft = (evt) => {
            //CG.info(evt);
            let _dY = evt.movementX * .03;
            let _dX = evt.movementY * .03;
            this.#_helperVec4_y.reset(-_dY, 0, -_dX, 0);

            this.#_space.getAxisX(this.#_helperVec4_x).removeY().normalize();
            this.#_space.getAxisZ(this.#_helperVec4_z).removeY().normalize();
            this.#_helperMat44.setWithColumns(this.#_helperVec4_x, Vec4.VEC4_0100, this.#_helperVec4_z, Vec4.VEC4_0001).multiplyVec4(this.#_helperVec4_y, this.#_helperVec4_y);
            this.moveHorizontally(this.#_helperVec4_y.x, this.#_helperVec4_y.z);
        }
        events.onDBClick((evt) => {
            this.lookAt(CG.Vec4.VEC4_0001);
        });
        events.onWheel((evt) => {
            let delta = 0.5 * Math.sign(evt.deltaY);
            this.#_spaceCtrl.moveForward(delta);
            //this.#_spaceCtrl.moveRight(delta);
            //this.#_spaceCtrl.moveUp(delta);
            //this.#_spaceCtrl.axisZPointsTo(CG.Vec4.VEC4_0001, false);
            //this.#_spaceCtrl.rotateAroundY(CG.Utils.deg2Rad(delta*5));
        });
        events.onDown(_onDown);
    }

    get viewMatrix() {
        return this.#_space.transformInv;
    }

    moveHorizontally(deltaX, delta) {
        this.#_spaceCtrl.moveHorizontally(deltaX, delta);
        return this;
    }

    moveAround(pos, dir_normalized, theta) {
        this.#_spaceCtrl.rotateAround(pos, dir_normalized, theta);
        return this;
    }

    /**
    * pos must be defined under world coordinate
    */
    lookAt(pos) {
        this.#_spaceCtrl.axisZPointsTo(pos, false);
        return this;
    }
}

window.CG ??= {};
window.CG.Camera = Camera;
console.log('[camera.js] loaded.');
