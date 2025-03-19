import glC from "./gl-const.js";
import Mesh from "./mesh.js"
import Primitive from "./primitive.js"
import { geometry } from "./geometry.js"
import { Mat44 } from "./math.js";
import { Pipeline, SubPipeline } from "./device-resource.js";
import { IPipeline, IProgram, IFramebuffer, IRenderer } from "./types-interfaces.js";
import { ICamera } from "./camera.js";
import getProgram from "./program-manager.js"

export default class GridFloor {

    private _color = [0.5, 0.5, 0.5];
    private _pipeline: IPipeline;

    constructor(fbo?: IFramebuffer) {
        const _geo = geometry.createGridPlane(100);

        const _subp = new SubPipeline()
            .setRenderObject(_geo)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_mMatrix", Mat44.IdentityMat44.data);
                program.uploadUniform("u_color", this._color);
            })
            .validate();

        this._pipeline = new Pipeline(-999)
            .setFBO(fbo)
            .blend(true, glC.SRC_ALPHA, glC.ONE_MINUS_SRC_ALPHA, glC.FUNC_ADD)
            .depthTest(true, glC.LESS)
            .setProgram(getProgram({ fn_fade_away_from_camera: true, color_uniform: true }))
            .appendSubPipeline(_subp)
            .validate();
    }

    get pipeline(): IPipeline {
        return this._pipeline;
    }

    update(dt: number): void {
    }
}

