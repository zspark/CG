import OrthogonalSpace from "./orthogonal-space.js"
import Mesh from "./mesh.js"
import { default as Geometry, createAxes } from "./geometry.js"
import { roMat44, Mat44 } from "./math.js";
import { Program, Pipeline, SubPipeline, Framebuffer, Renderer } from "./gl.js";
import createLoader from "./assets-loader.js";

export default class Axes extends Mesh {

    private _ref_target: OrthogonalSpace;
    private _tempMat44: Mat44 = new Mat44().setIdentity();
    private _pipeline: Pipeline;

    constructor(gl: WebGL2RenderingContext, fbo: Framebuffer, renderer: Renderer) {
        super(createAxes(5).init(gl));
        this._pipeline = new Pipeline(gl, -100000);
        this._ref_target = this;
        const _subPipeAxes = new SubPipeline().setGeometry(this.geometry)
            .setDrawArraysParameters({
                mode: gl.LINES,
                first: 0,
                count: 30,
            }).setUniformUpdater({
                updateu_mvpMatrix: (uLoc: WebGLUniformLocation) => {
                    this._tempMat44.multiply(this._ref_target.transform, this._tempMat44);
                    gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
                },
            })

        createLoader("./").loadShader("./glsl/vertexColor").then((sources) => {
            this._pipeline
                .setFBO(fbo)
                .setProgram(new Program(gl, sources[0], sources[1])).validate()
                .appendSubPipeline(_subPipeAxes)
                .depthTest(false/*, gl.LESS*/)
            renderer.addPipeline(this._pipeline);
        });
    }

    update(dt: number, vpMatrix: roMat44): void {
        this._tempMat44.copyFrom(vpMatrix);
    }
    attachTo(target?: OrthogonalSpace) {
        if (target) this._ref_target = target;
        else this._ref_target = this;
    }
}

