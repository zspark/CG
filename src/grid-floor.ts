import glC from "./gl-const.js";
import { geometry } from "./geometry.js"
import { Pipeline, SubPipeline } from "./device-resource.js";
import {
    IPipeline,
    IFramebuffer
} from "./types-interfaces.js";
import { createProgram } from "./program-manager.js"

const _vert = `#version 300 es
precision mediump float;
layout(std140) uniform u_ub_camera {
    mat4 u_vInvMatrix;
    mat4 u_vMatrix;
    mat4 u_pMatrix;
    mat4 u_pInvMatrix;
    mat4 u_vpMatrix;
};
layout(location = 0) in vec3 a_position;
out float v_distanceToCamera;
void main(){
    vec4 pos = vec4(a_position, 1.0);
    v_distanceToCamera = -(u_vMatrix *  pos).z;
    gl_Position = u_vpMatrix * pos;
}`;

const _frag = `#version 300 es
precision mediump float;
in float v_distanceToCamera;
out vec4 o_fragColor;
void main() {
    o_fragColor = vec4(.5, .5, .5, 1.0 - smoothstep(10., 30., v_distanceToCamera));
}`;

export default class GridFloor {

    private _pipeline: IPipeline;

    constructor(fbo?: IFramebuffer) {
        const _geo = geometry.createGridPlane(100);
        const _subp = new SubPipeline().setRenderObject(_geo).validate();

        this._pipeline = new Pipeline(-999, "grid ground pipeline")
            .setFBO(fbo)
            .blend(true, glC.SRC_ALPHA, glC.ONE_MINUS_SRC_ALPHA, glC.FUNC_ADD)
            .depthTest(true, glC.LESS)
            .setProgram(createProgram(_vert, _frag))
            .appendSubPipeline(_subp)
            .validate();
    }

    get pipeline(): IPipeline {
        return this._pipeline;
    }

    update(dt: number): void {
    }
}

