import log from "./log.js"
import { roMat44, xyzw, Mat44, Vec4 } from "./math.js"
import { IGeometry } from "./types-interfaces.js"
import { Pickable_t } from "./picker.js";
import utils from "./utils.js";
import SpacialNode from "./spacial-node.js";
import Primitive from "./primitive.js";

/*
export interface IMesh extends OrthogonalSpace{
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
export default class Mesh extends SpacialNode {

    protected _primitiveSet: Set<Primitive> = new Set();
    protected _uuid: number = utils.uuid();

    constructor(name?: string, primitive?: Primitive) {
        super(name);
        primitive && this.addPrimitive(primitive);
    }

    get uuid(): number {
        return this._uuid;
    }

    addPrimitive(p: Primitive): void {
        this._primitiveSet.add(p);
    }

    setPrimitive(p: Primitive): void {
        this._primitiveSet.clear();
        this.addPrimitive(p);
    }

    removePrimitive(p: Primitive): boolean {
        return this._primitiveSet.delete(p);
    }

    getPickables(): Pickable_t[] {
        const _out: Pickable_t[] = [];
        this._primitiveSet.forEach(p => {
            _out.push({
                primitive: p,
                mesh: this,
            });
        });

        return _out;
    }

    getPrimitives(): Primitive[] {
        const _arrGeo: Primitive[] = [];
        this._primitiveSet.forEach(p => {
            _arrGeo.push(p);
        });

        return _arrGeo;
    }

    getGeometrys(): IGeometry[] {
        const _arrGeo: IGeometry[] = [];
        this._primitiveSet.forEach(p => {
            _arrGeo.push(p.geometry);
        });

        return _arrGeo;
    }
}

