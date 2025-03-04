import glC from "./gl-const.js";
import Mesh from "./mesh.js"
import { geometry } from "./geometry.js"
import { Mat44 } from "./math.js";
import { Program, Pipeline, Framebuffer, SubPipeline, Renderer } from "./gl.js";
import { ICamera } from "./camera.js";
import { default as ShaderAssembler, ShaderID_t } from "./shader-assembler.js";

export default class GridFloor extends Mesh {

    private _tempMat44: Mat44 = new Mat44().setIdentity();
    private _tempMat44b: Mat44 = new Mat44().setIdentity();
    private _pipeline: Pipeline;

    constructor(gl: WebGL2RenderingContext, renderer: Renderer, fbo?: Framebuffer) {
        super(geometry.createGridPlane(100).init(gl));
        this._pipeline = new Pipeline(gl, -999);
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
                    this._tempMat44b.multiply(this.transform, this._tempMat44b);
                    gl.uniformMatrix4fv(uLoc, false, this._tempMat44b.data);
                },
            })

        ShaderAssembler.loadShaderSource().then(_ => {
            const id: ShaderID_t = {
                fade_away_from_camera: true,
            }
            let _out = ShaderAssembler.assembleVertexSource(id);
            let _out2 = ShaderAssembler.assembleFragmentSource(id);
            this._pipeline
                .setFBO(fbo)
                .blend(true, glC.SRC_ALPHA, glC.ONE_MINUS_SRC_ALPHA, glC.FUNC_ADD)
                .depthTest(true, gl.LESS)
                .setProgram(new Program(gl, _out.source, _out2.source)).validate()
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

