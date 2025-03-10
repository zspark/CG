import { geometry } from "./geometry.js"
import { Pipeline, SubPipeline } from "./device-resource.js";
import getProgram from "./program-manager.js"
import { IProgram, IGeometry, IPipeline, ITexture, IRenderer, ISubPipeline } from "./types-interfaces.js";

export default class Outline {

    private _frontFBOQuad: IGeometry;
    private _pipeline: IPipeline;
    private _subPipeline: ISubPipeline;
    private _ref_renderer: IRenderer;
    private _doneFlag: boolean = false;
    private _enabledFlag: boolean = false;

    constructor(gl: WebGL2RenderingContext, renderer: IRenderer) {
        this._ref_renderer = renderer;
        this._frontFBOQuad = geometry.createFrontQuad().createGPUResource(gl, true);
        this._subPipeline = new SubPipeline()
            .setGeometry(this._frontFBOQuad)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_edgeThrottle", 2);
                program.uploadUniform("u_depthTexture_r32f", 0);
            });

        this._pipeline = new Pipeline(-200000)
            .setProgram(getProgram({ position_in_ndc: true, sobel_silhouette: true, }))
            .depthTest(false/*, glC.LESS*/)
            .cullFace(false)
            .appendSubPipeline(this._subPipeline)
            .validate()
        this._doneFlag = true;
        if (this._enabledFlag) this._ref_renderer.addPipeline(this._pipeline);
    }

    setDepthTexture(texture: ITexture): Outline {
        this._subPipeline.setTexture(texture);
        return this;
    }

    enable(): void {
        this._enabledFlag = true;
        if (this._doneFlag) this._ref_renderer.addPipeline(this._pipeline);
    }
    disable(): void {
        this._enabledFlag = false;
        if (this._doneFlag) this._ref_renderer.removePipeline(this._pipeline);
    }
}

