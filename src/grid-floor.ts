import glC from "./gl-const.js";
import Mesh from "./mesh.js"
import { geometry } from "./geometry.js"
import { Mat44 } from "./math.js";
import { Program, Pipeline, SubPipeline, Renderer } from "./gl.js";
import createLoader from "./assets-loader.js";
import { ICamera } from "./camera.js";

export default class GridFloor extends Mesh {

    private _tempMat44: Mat44 = new Mat44().setIdentity();
    private _tempMat44b: Mat44 = new Mat44().setIdentity();
    private _pipeline: Pipeline;

    constructor(gl: WebGL2RenderingContext, renderer: Renderer) {
        super(geometry.createGridPlane(100).init(gl));
        this._pipeline = new Pipeline(gl, 100000);
        const _subP = new SubPipeline().setGeometry(this.geometry)
            .setDrawArraysParameters({
                mode: glC.LINES,
                first: 0,
                count: 3000,
            }).setUniformUpdater({
                updateu_mvpMatrix: (uLoc: WebGLUniformLocation) => {
                    this._tempMat44.multiply(this.transform, this._tempMat44);
                    gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
                },
                updateu_mvMatrix: (uLoc: WebGLUniformLocation) => {
                    this._tempMat44b.multiply(this.transform, this._tempMat44);
                    gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
                },
            })

        createLoader("./").loadShader("./glsl/fade-away-from-camera").then((sources) => {
            this._pipeline
                .blend(true, glC.SRC_ALPHA, glC.ONE_MINUS_SRC_ALPHA, glC.FUNC_ADD)
                .setProgram(new Program(gl, sources[0], sources[1]))
                .appendSubPipeline(_subP)
                .validate()
            renderer.addPipeline(this._pipeline);
        });
    }

    update(dt: number, camera: ICamera): void {
        this._tempMat44.copyFrom(camera.viewProjectionMatrix);
        this._tempMat44b.copyFrom(camera.viewMatrix);
    }
}

