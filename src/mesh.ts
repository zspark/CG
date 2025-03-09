import log from "./log.js"
import { roMat44, xyzw, Mat44, Vec4 } from "./math.js"
import OrthogonalSpace from "./orthogonal-space.js"
import { IGeometry } from "./types-interfaces.js"
import { IPickable } from "./picker.js";
import utils from "./utils.js";
import SpacialNode from "./spacial-node.js";

/*
export interface IMesh extends OrthogonalSpace, IPickable {
    readonly uuid: number;
    readonly numberIndices: number;
    readonly vertexDataLengthInFloat: number;
    readonly material: any;
    geometry: IGeometry;

    addChildMesh(mesh: IMesh): boolean;
    removeChildMesh(mesh: IMesh): boolean;
    removeChildMeshes(): boolean;
}
*/

/**
* mesh is defined under model space;
* so we use `meshMatrix` to transform it into model space;
* the major purpose of Mesh is to transform position and orientation of a geometry;
*/
export default class Mesh extends SpacialNode implements IPickable {

    protected _ref_geo: IGeometry;
    protected _uuid: number = utils.uuid();

    constructor(name?: string, geometry?: IGeometry) {
        super(name);
        this._ref_geo = geometry;
    }

    get uuid(): number { return this._uuid; }

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

    get geometry(): IGeometry {
        return this._ref_geo;
    }

    set geometry(geo: IGeometry) {
        this._ref_geo = geo;
    }
}
