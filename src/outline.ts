import { geometry } from "./geometry.js"
import { Texture, Program, Pipeline, SubPipeline, Renderer } from "./device-resource.js";
import { IGeometry, IPipeline, ITexture, IRenderer, ISubPipeline } from "./types-interfaces.js";
import createLoader from "./assets-loader.js";

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
            .setUniformUpdater({
                updateu_edgeThrottle: (uLoc: WebGLUniformLocation) => {
                    gl.uniform1f(uLoc, 2);
                },
                updateu_depthTexture_r32f: (uLoc: WebGLUniformLocation) => {
                    gl.uniform1i(uLoc, 0);

                },
            })

        this._pipeline = new Pipeline(gl, -200000)
            .depthTest(false/*, glC.LESS*/)
            .cullFace(false)
            .appendSubPipeline(this._subPipeline);

        createLoader("./").loadShader_separate("./glsl/one-texture-front-quad", "./glsl/sobel-silhouette").then((sources) => {
            this._pipeline.setProgram(new Program(gl, sources[0], sources[1])).validate()
            this._doneFlag = true;
            if (this._enabledFlag) this._ref_renderer.addPipeline(this._pipeline);
        });
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

