if (!CG.Vec4) CG.vital("math.js file should be loaded first!");
window.CG ??= {};


(function () {

    /**
    * movement interacts with 3d spaces, so, every space should implement a interface like this:
    *
    * transform(subspace_mat44);
    * setPosition(x, y, z);
    * setAxisZ(x, y, z);
    * setAxisX(x, y, z);
    * setAxisY(x, y, z);
    *
    * these are base infomations of a frame.
    */

    class Movement {
        #_helperMat44 = new CG.Mat44();
        #_3dspace;
        constructor(space) {
            this.setSpace(space);
        }
        setSpace(space) {
            this.#_3dspace = space;
        }

        /**
        * move to x-postive direction;
        */
        moveRight(delta) {
            this.#_helperMat44.setToIdentity();
            this.#_helperMat44._dataArr32[12] = delta;
            this.#_3dspace.transform(this.#_helperMat44);
        }

        /**
        * move to y-postive direction;
        */
        moveUp(delta) {
            this.#_helperMat44.setToIdentity();
            this.#_helperMat44._dataArr32[13] = delta;
            this.#_3dspace.transform(this.#_helperMat44);
        }

        /**
        * move to z-postive direction;
        */
        moveForward(delta) {
            this.#_helperMat44.setToIdentity();
            this.#_helperMat44._dataArr32[14] = delta;
            this.#_3dspace.transform(this.#_helperMat44);
        }

        /*
        rotateAround(distanceFromSpaceCenter, theta, phi){
            //new postion;
            // axises;
        }
        */

        moveHorizontally(delta, x, z) {

        }
    }

    window.CG.Movement = Object.freeze(Movement);

    CG.info('[movement.js] loaded.');
})()
