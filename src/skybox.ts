import log from "./log.js";
import glC from "./gl-const.js";
import { geometry } from "./geometry.js"
import {
    Pipeline,
    SubPipeline,
} from "./device-resource.js";
import { createProgram } from "./program-manager.js"
import {
    IProgram,
    IGeometry,
    IPipeline,
    ITexture,
    ISubPipeline,
} from "./types-interfaces.js";

const _skybox: string[] = [
    `#version 300 es
#define SHADER_NAME skybox
precision mediump float;
layout(std140) uniform u_ub_camera {
    mat4 u_vInvMatrix;
    mat4 u_vMatrix;
    mat4 u_pMatrix;
    mat4 u_pInvMatrix;
    mat4 u_vpMatrix;
};
layout(location = 0) in vec3 a_position;
out vec3 v_uvSkybox;
void main(){
    v_uvSkybox = a_position;
    vec3 a = inverse(mat3(u_vInvMatrix)) * a_position;
    gl_Position = u_pMatrix * vec4(a, 1.0);
}`
    ,

    `#version 300 es
#define SHADER_NAME skybox
precision mediump float;
uniform samplerCube u_skyboxTexture;
out vec4 o_fragColor;
in vec3 v_uvSkybox;
void main() {
    o_fragColor = texture(u_skyboxTexture, v_uvSkybox);
}`];

const _equirectangular: string[] = [
    `#version 300 es
#define SHADER_NAME equirectangular
precision mediump float;
layout(std140) uniform u_ub_camera {
    mat4 u_vInvMatrix;
    mat4 u_vMatrix;
    mat4 u_pMatrix;
    mat4 u_pInvMatrix;
    mat4 u_vpMatrix;
};
layout(location = 0) in vec3 a_position;
out vec3 v_rayDirection;
void main(){
    vec4 pos = vec4(a_position, 1.0);
    vec4 viewPos = u_pInvMatrix * pos;
    viewPos /= viewPos.w;
    viewPos.w = 0.f;  // be careful direction transformation.
    vec4 worldPos = u_vInvMatrix * viewPos;
    v_rayDirection = worldPos.xyz;
    gl_Position = pos;
}`
    ,

    `#version 300 es
#define SHADER_NAME equirectangular
precision mediump float;
#define PI2 6.283185307179586
#define PI 3.14159265359
uniform sampler2D u_skybox_latlon;
in vec3 v_rayDirection;
out vec4 o_fragColor;
void main() {
    vec3 rayDir = normalize(v_rayDirection);
    float u = 0.5 + atan(rayDir.z, rayDir.x) / PI2;
    float v = 0.5 - asin(rayDir.y) / PI;
    o_fragColor = texture(u_skybox_latlon, vec2(u, v));
}`
];

export default class Skybox {

    private _box: IGeometry;
    private _pipeline;
    private _subpipeline: ISubPipeline;

    constructor() {
        this._box = geometry.createCube(50);

        this._pipeline = new Pipeline(9)
            .cullFace(true, glC.FRONT)
            .depthTest(false, glC.LESS)
            .blend(false, glC.SRC_ALPHA, glC.ONE_MINUS_SRC_ALPHA, glC.FUNC_ADD)
            .setProgram(createProgram(_skybox))
            .appendSubPipeline(this._subpipeline)
            .validate()
    }

    set texture(texture: ITexture) {
        if (!texture) return;
        this._pipeline.removeSubPipeline(this._subpipeline);
        this._subpipeline = new SubPipeline()
            .setRenderObject(this._box)
            .setTexture(texture)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_skyboxTexture", texture.textureUnit);
            });
        this._pipeline.appendSubPipeline(this._subpipeline);
    }

    get pipeline(): IPipeline {
        return this._pipeline;
    }

    update(dt: number): void {
    }
}

