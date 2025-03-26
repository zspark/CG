import log from "./log.js"
import {
    IPrimitive,
    IMaterial,
    IRenderObject,
    IGeometry,
} from "./types-interfaces.js"
import utils from "./utils.js";
import Material from "./material.js";
import Geometry from "./geometry.js";
import AABB from "./aabb.js";

export default class Primitive implements IPrimitive, IRenderObject {

    protected _ref_geo: IGeometry;
    protected _uuid: number = utils.uuid();
    protected _material: IMaterial;
    private _name: string;
    private _aabb: AABB = new AABB();

    constructor(name?: string, geometry?: IGeometry) {
        this._name = name;
        geometry && (this.geometry = geometry);
    }

    get criticalKey(): object {
        return Geometry;
    }

    get aabb(): AABB {
        return this._aabb;
    }

    bind(): void {
        this._ref_geo.bind();
        (this._material ?? _defaultMaterial).bind();
    }

    get name(): string {
        return this._name;
    }

    get uuid(): number {
        return this._uuid;
    }

    get material(): IMaterial {
        return this._material ?? _defaultMaterial;
    }

    set material(m: IMaterial) {
        this._material = m;
    }

    get geometry(): IGeometry {
        return this._ref_geo;
    }

    set geometry(geo: IGeometry) {
        this._ref_geo = geo;
    }

    get drawCMD(): () => void {
        return this._ref_geo.drawCMD;
    }

    createGPUResource(gl: WebGL2RenderingContext): IPrimitive {
        this._ref_geo.createGPUResource(gl);
        return this;
    }
}

const _defaultMaterial = new Material('default-material');
