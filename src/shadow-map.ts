import glC from "./gl-const.js";
import getProgram from "./program-manager.js"
import { geometry } from "./geometry.js"
import Mesh from "./mesh.js"
import { GLFramebuffer_Depth_f } from "./webgl.js";
import {
    IUniformBlock,
    IRenderContext,
    IRenderer,
    IGeometry,
    IBuffer, BufferData_t, StepMode_e, ShaderLocation_e,
    IProgram,
    ITexture, ISkyboxTexture,
    IFramebuffer,
    IPipeline, ISubPipeline, UniformUpdaterFn_t, PipelineOption_t, SubPipelineOption_t,
    IBindableObject,
} from "./types-interfaces.js";
import { createContext, Framebuffer, Pipeline, SubPipeline } from "./device-resource.js";

export default class ShadowMap {

    private _shadowMapFBO: GLFramebuffer_Depth_f;
    private _shadowMapPipeline: IPipeline;

    constructor(gl: WebGL2RenderingContext) {

        this._shadowMapFBO = new GLFramebuffer_Depth_f(2048, 2048);
        //this._shadowMapFBO = new GLFramebuffer_Depth_f(640, 480);
        this._shadowMapFBO.createGPUResource(gl);
        this._shadowMapPipeline = new Pipeline(100000)
            .setFBO(this._shadowMapFBO)
            .cullFace(true, glC.BACK)
            .depthTest(true, glC.LESS)
            .setProgram(getProgram({ fn_shadow_map: true, no_output: true }))
            .drawBuffers(glC.NONE)
            .validate()
    }

    get pipeline(): IPipeline {
        return this._shadowMapPipeline;
    }

    get depthTexture(): ITexture {
        return this._shadowMapFBO.depthTexture;
    }

    addTarget(mesh: Mesh): void {
        mesh.getPrimitives().forEach(p => {
            this._shadowMapPipeline.appendSubPipeline(
                new SubPipeline()
                    .setRenderObject(p.geometry)
                    .setUniformUpdaterFn((program: IProgram) => {
                        program.uploadUniform("u_mMatrix", mesh.modelMatrix.data);
                    })
            )
        });
    }
}
