import log from "./log.js"
import { roMat44, xyzw, Mat44, Vec4 } from "./math.js"
import { IGeometry } from "./types-interfaces.js"
import { Pickable_t } from "./picker.js";
import utils from "./utils.js";
import SpacialNode from "./spacial-node.js";
import Primitive from "./primitive.js";
import AABB from "./aabb.js";

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
    protected _enablePick: boolean = false;
    protected _aabb: AABB = new AABB();

    constructor(name?: string, primitive?: Primitive) {
        super(name);
        primitive && this.addPrimitive(primitive);
    }

    get uuid(): number {
        return this._uuid;
    }

    get aabb(): AABB {
        return this._aabb;
    }

    get enablePick(): boolean {
        return this._enablePick;
    }

    set enablePick(value: boolean) {
        this._enablePick = value;
    }

    addPrimitive(p: Primitive): void {
        this._primitiveSet.add(p);
        this._aabb.append(p.aabb);
    }

    setPrimitive(p: Primitive): void {
        this.removePrimitives();
        this.addPrimitive(p);
    }

    removePrimitive(p: Primitive): boolean {
        return this._primitiveSet.delete(p);
    }

    removePrimitives(): void {
        this._primitiveSet.clear();
        this._aabb.reset();
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

