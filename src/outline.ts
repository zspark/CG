import glC from "./gl-const.js";
import { geometry } from "./geometry.js"
import { Pipeline, SubPipeline } from "./device-resource.js";
import getProgram from "./program-manager.js"
import { GLFramebuffer_C0_r32f } from "./webgl.js"
import { roMat44, Mat44, Vec4 } from "./math.js"
import { IProgram, IGeometry, IPipeline, ITexture, IRenderer, ISubPipeline } from "./types-interfaces.js";
import { ICamera } from "./camera.js";

export type OutlineTarget_t = {
    geometry: IGeometry;
    modelMatrix: roMat44;
};

export default class Outline {

    private _frontFBOQuad: IGeometry;
    private _pipeline: IPipeline;
    private _subPipeline: ISubPipeline;
    private _fbo: GLFramebuffer_C0_r32f;
    private _backFBOPipeline: IPipeline;

    constructor() {
        this._frontFBOQuad = geometry.createFrontQuad();

        const width: number = 640;
        const height: number = 480;
        this._fbo = new GLFramebuffer_C0_r32f(width, height);
        //.drawBuffers(gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1)
        this._backFBOPipeline = new Pipeline(100)
            .setFBO(this._fbo)
            .cullFace(true, glC.BACK)
            .depthTest(false, glC.LESS)
            .setProgram(getProgram({ r32f: true }))
            .validate()

        this._subPipeline = new SubPipeline()
            .setGeometry(this._frontFBOQuad)
            .setTexture(this._fbo.colorTexture0)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_edgeThrottle", 2);
                program.uploadUniform("u_depthTexture_r32f", this._fbo.colorTexture0.textureUnit);
            });

        this._pipeline = new Pipeline(-200000)
            .setProgram(getProgram({ position_in_ndc: true, fn_sobel_silhouette: true, }))
            .depthTest(false/*, glC.LESS*/)
            .cullFace(false)
            .appendSubPipeline(this._subPipeline)
            .validate()
    }

    setTarget(target: OutlineTarget_t): Outline {
        this.removeAllTargets();
        this._backFBOPipeline.appendSubPipeline(
            new SubPipeline()
                .setGeometry(target.geometry)
                .setUniformUpdaterFn((program: IProgram) => {
                    program.uploadUniform("u_mMatrix", target.modelMatrix.data);
                })
        )
        return this;
    }

    get pipelines(): IPipeline[] {
        return [this._pipeline, this._backFBOPipeline];
    }

    removeAllTargets(): Outline {
        this._backFBOPipeline.removeSubPipelines();
        return this;
    }

    update(dt: number): void {
    }
}

