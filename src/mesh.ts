import log from "./log.js"
import OrthogonalSpace from "./orthogonal-space.js"
import { IGeometry } from "./geometry.js"


/**
* mesh is defined under model space;
* so we use `meshMatrix` to transform it into model space;
* the major purpose of Mesh is to transform position and orientation of a geometry;
*/
export default class Mesh extends OrthogonalSpace {
    private _ref_geo: IGeometry;
    constructor(geo: IGeometry) {
        super();
        this._ref_geo = geo;
    }

    get numberIndices(): number {
        return this._ref_geo.indexBufferLength;
    }

    get vertexDataLengthInFloat(): number {
        return this._ref_geo.vertexBufferLength;
    }

    get material(): any {
        log.info('[mesh] TODO: need material!');
        return undefined;
    }

    get VAO(): WebGLVertexArrayObject {
        return this._ref_geo.VAO;
    }
}
