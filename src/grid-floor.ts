import glC from "./gl-const.js";
import Mesh from "./mesh.js"
import { geometry } from "./geometry.js"
import { Mat44 } from "./math.js";
import { Pipeline, SubPipeline } from "./device-resource.js";
import { IPipeline, IProgram, IFramebuffer, IRenderer } from "./types-interfaces.js";
import { ICamera } from "./camera.js";
import getProgram from "./program-manager.js"

export default class GridFloor extends Mesh {

    private _color = [0.5, 0.5, 0.5];
    private _tempMat44: Mat44 = new Mat44().setIdentity();
    private _tempMat44b: Mat44 = new Mat44().setIdentity();
    private _pipeline: IPipeline;

    constructor(gl: WebGL2RenderingContext, renderer: IRenderer, fbo?: IFramebuffer) {
        super("internal-grid-floor", geometry.createGridPlane(100).createGPUResource(gl, true));
        const _subP = new SubPipeline()
            .setGeometry(this.geometry)
            .setUniformUpdaterFn((program: IProgram) => {
                this._tempMat44.multiply(this.modelMatrix, this._tempMat44);
                program.uploadUniform("u_mvpMatrix", this._tempMat44.data);
                this._tempMat44b.multiply(this.modelMatrix, this._tempMat44b);
                program.uploadUniform("u_mvMatrix", this._tempMat44.data);
                program.uploadUniform("u_color", this._color);
            })
            .validate();

        this._pipeline = new Pipeline(-999)
            .setFBO(fbo)
            .blend(true, glC.SRC_ALPHA, glC.ONE_MINUS_SRC_ALPHA, glC.FUNC_ADD)
            .depthTest(true, glC.LESS)
            .setProgram(getProgram({ fade_away_from_camera: true, color_uniform: true }))
            .appendSubPipeline(_subP)
            .validate();

        renderer.addPipeline(this._pipeline);
    }

    update(dt: number, camera: ICamera): void {
        this._tempMat44.copyFrom(camera.viewProjectionMatrix);
        this._tempMat44b.copyFrom(camera.viewMatrix);
    }
}

