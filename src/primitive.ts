import log from "./log.js"
import { roMat44, xyzw, Mat44, Vec4 } from "./math.js"
import { IPrimitive, IMaterial, IRenderObject, ISubPipeline, IGeometry, IProgram } from "./types-interfaces.js"
import { Pickable_t } from "./picker.js";
import utils from "./utils.js";
import Material from "./material.js";
import Geometry from "./geometry.js";
import { SubPipeline } from "./device-resource.js";

export default class Primitive implements IPrimitive, IRenderObject {

    protected _ref_geo: IGeometry;
    protected _uuid: number = utils.uuid();
    protected _material: IMaterial;
    private _name: string;

    constructor(name?: string, geometry?: IGeometry) {
        this._name = name;
        geometry && (this.geometry = geometry);
    }

    get criticalKey(): object {
        return Geometry;
    }
    bind(): void {
        this._ref_geo.bind();
        this._material.bind();
    }

    get name(): string {
        return this._name;
    }

    get uuid(): number {
        return this._uuid;
    }

    get material(): IMaterial {
        return this._material;
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
