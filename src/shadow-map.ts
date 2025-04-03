import glC from "./gl-const.js";
import { createProgram } from "./program-manager.js"
import Mesh from "./mesh.js"
import { GLFramebuffer_Depth_f } from "./webgl.js";
import { Pipeline, SubPipeline } from "./device-resource.js";
import {
    IProgram,
    ITexture,
    IPipeline,
} from "./types-interfaces.js";

const _vert = `#version 300 es
precision mediump float;
uniform mat4 u_mMatrix;
layout(std140) uniform u_ub_light {
    mat4 u_lInvMatrix;
    mat4 u_lMatrix;
    mat4 u_lpMatrix;
    vec4 u_lightColor;  // w: intensity;
};
layout(location = 0) in vec3 a_position;
void main(){
    vec4 pos = vec4(a_position, 1.0);
    gl_Position = u_lpMatrix * u_mMatrix * pos;
}`;

const _frag = `#version 300 es
precision mediump float;
void main() { }`;

export default class ShadowMap {

    private _shadowMapFBO: GLFramebuffer_Depth_f;
    private _shadowMapPipeline: IPipeline;

    constructor(gl: WebGL2RenderingContext) {

        this._shadowMapFBO = new GLFramebuffer_Depth_f(2048, 2048);
        this._shadowMapFBO.createGPUResource(gl);
        this._shadowMapPipeline = new Pipeline(100000, "shadow map pipeline")
            .setFBO(this._shadowMapFBO)
            .cullFace(true, glC.BACK)
            .depthTest(true, glC.LESS)
            .setProgram(createProgram(_vert, _frag))
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
