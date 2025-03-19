import log from "./log.js"
import glC from "./gl-const.js";
import { BINDING_POINT } from "./gl-const.js"
import { UniformBlock } from "./device-resource.js"
import { Vec4, rgba } from "./math.js"
import { IBindableObject, IMaterial, api_IMaterial, ITexture, IUniformBlock } from "./types-interfaces.js"

const _sizeInFloat = 4 + 4 + 4;
export default class Material implements IMaterial {

    private _uboDirty: boolean = true;
    private _uboData: Float32Array;
    name: string;
    pbrMR_baseColorTexture: ITexture;
    pbrMR_metallicRoughnessTexture: ITexture;
    normalTexture: ITexture;
    occlusionTexture: ITexture;
    emissiveTexture: ITexture;

    private _factors: Vec4;
    private _pbrMR_baseColorFactor: Vec4;// number[] = [1, 1, 1];
    private _emissiveFactor: Vec4;// number[] = [0, 0, 0];

    constructor(name?: string) {
        this.name = name ?? "material";

        this._uboData = new Float32Array(_sizeInFloat);
        this._factors = new Vec4(1, 1, 1, 1, this._uboData, 4 * 0);
        this._pbrMR_baseColorFactor = new Vec4(1, 1, 1, 1, this._uboData, 4 * 1);
        this._emissiveFactor = new Vec4(0, 0, 0, 0, this._uboData, 4 * 2);
    }

    get criticalKey(): object {
        return Material;
    }

    bind(): void {
        _UBO.uploadData(this._uboData);
    }

    get API(): api_IMaterial {
        return this;
    }

    update(dt: number): void {
        if (this._uboDirty) {
            _UBO.uploadData(this._uboData);
            this._uboDirty = false;
        }
    }

    get pbrMR_roughnessFactor(): number {
        return this._factors.x;
    }
    set pbrMR_roughnessFactor(v: number) {
        this._factors.x = v;
        this._uboDirty = true;
    }
    get pbrMR_metallicFactor(): number {
        return this._factors.y;
    }
    set pbrMR_metallicFactor(v: number) {
        this._factors.y = v;
        this._uboDirty = true;
    }
    get normalTextureScale(): number {
        return this._factors.z;
    }
    set normalTextureScale(v: number) {
        this._factors.z = v;
        this._uboDirty = true;
    }
    get occlusionTextureStrength(): number {
        return this._factors.w;
    }
    set occlusionTextureStrength(v: number) {
        this._factors.w = v;
        this._uboDirty = true;
    }
    setPbrMR_baseColorFactor(r: number, g: number, b: number, a: number): void {
        this._pbrMR_baseColorFactor.reset(r, g, b, a);
        this._uboDirty = true;
    }
    get pbrMR_baseColorFactor(): number[] {
        return this._pbrMR_baseColorFactor.toArray();
    }
    set pbrMR_baseColorFactor(arr: number[]) {
        this._pbrMR_baseColorFactor.reset(arr[0], arr[1], arr[2], arr[3]);
        this._uboDirty = true;
    }
    get emissiveFactor(): number[] {
        return this._emissiveFactor.toArray();
    }
    set emissiveFactor(arr: number[]) {
        this._emissiveFactor.reset(arr[0], arr[1], arr[2], 0);
        this._uboDirty = true;
    }
    setEmissiveFactor(r: number, g: number, b: number): void {
        this._emissiveFactor.reset(r, g, b, 0);
        this._uboDirty = true;
    }
}

let _UBO: IUniformBlock;
export function getUBO(): IUniformBlock {
    if (!_UBO) {
        _UBO = new UniformBlock(BINDING_POINT.UBO_BINDING_POINT_MATERIAL, _sizeInFloat * 4);
    }
    return _UBO;
}
