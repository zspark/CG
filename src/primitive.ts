import log from "./log.js"
import { roMat44, xyzw, Mat44, Vec4 } from "./math.js"
import { ISubPipeline, IGeometry, IProgram } from "./types-interfaces.js"
import { Pickable_t } from "./picker.js";
import utils from "./utils.js";
import { SubPipeline } from "./device-resource.js";

export default class Primitive {

    protected _ref_geo: IGeometry;
    protected _uuid: number = utils.uuid();
    private _name: string;

    constructor(name?: string, geometry?: IGeometry) {
        this._name = name;
        geometry && (this.geometry = geometry);
    }

    get name(): string {
        return this._name;
    }

    get uuid(): number {
        return this._uuid;
    }

    get numberIndices(): number {
        return this._ref_geo.indexBufferLength;
    }

    get vertexDataLengthInFloat(): number {
        return this._ref_geo.vertexBufferLength;
    }

    get material(): any {
        log.info('[primitive] TODO: need material!');
        return undefined;
    }

    get geometry(): IGeometry {
        return this._ref_geo;
    }

    set geometry(geo: IGeometry) {
        this._ref_geo = geo;
    }
}
