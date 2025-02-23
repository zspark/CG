if (!CG.OrthogonalSpace) CG.vital("orthogonal-space.js file should be loaded first!");

/**
* mesh is defined under model space;
* so we use `meshMatrix` to transform it into model space;
* the major purpose of Mesh is to transform position and orientation of a geometry;
*/
class Mesh extends CG.OrthogonalSpace {
    #_ref_geo;
    constructor(geo) {
        super();
        this.#_ref_geo = geo;
    }

    get numberIndices() {
        return this.#_ref_geo.indexBufferLength;
    }

    get vertexDataLengthInFloat() {
        return this.#_ref_geo.vertexBufferLength;
    }

    get material() {
        CG.info('[mesh] TODO: need material!');
    }
}

window.CG ??= {};
window.CG.Mesh = Mesh;

console.log('[mesh.js] loaded.');

