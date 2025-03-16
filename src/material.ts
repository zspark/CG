import glC from "./gl-const.js";
import log from "./log.js"
import {
    createContext_fn_t,
    IUniformBlock,
    IRenderContext,
    IGeometry,
    IBuffer, BufferData_t, BufferLayout_t, StepMode_e, ShaderLocation_e,
    IProgram,
    ITexture, ISkyboxTexture,
    IFramebuffer,
    IPipeline, ISubPipeline, UniformUpdaterFn_t, PipelineOption_t, SubPipelineOption_t,
    IRenderer,
    IBindableObject,
} from "./types-interfaces.js";

export default class Material {

    private _name: string;

    _albedoTexture: ITexture;
    _normalTexture: ITexture;
    _normalTextureScale: number = 1.0;
    _occlusionTexture: ITexture;
    _occlusionTextureStrength: number = 1.0;
    _emissiveTexture: ITexture;
    _emissiveTextureFactor: number[] = [1, 1, 1];

    constructor(name?: string) {
        this._name = name ?? "material";

    }
}

