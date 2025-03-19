import log from "./log.js";
import glC from "./gl-const.js";
import { geometry } from "./geometry.js"
import { Texture, Pipeline, SubPipeline } from "./device-resource.js";
import { createProgram } from "./program-manager.js"
import { IProgram, IGeometry, IPipeline, ITexture, IRenderer, ISubPipeline } from "./types-interfaces.js";
import { Loader } from "./assets-loader.js";

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
out vec3 v_rayDirection;
void main(){
    vec4 pos = vec4(a_position, 1.0);
    vec4 viewPos = u_pInvMatrix * pos;
    viewPos /= viewPos.w;
    viewPos.w = 0.f;  // be careful direction transformation.
    vec4 worldPos = u_vInvMatrix * viewPos;
    v_rayDirection = worldPos.xyz;
    gl_Position = pos;
}`;

const _frag = `#version 300 es
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
}`;

export default class Skybox {

    private _latlonTexture: ITexture;
    private _plane;
    private _pipeline;

    constructor() {
        Loader.loadTexture("./assets/skybox/latlon.jpg").then((v) => {
            this._latlonTexture.updateData(v);
        });
        this._latlonTexture = new Texture(4096, 2048, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
        this._plane = geometry.createPlane(2, 2);
        const _subPipeCubeLatlon = new SubPipeline()
            .setRenderObject(this._plane)
            .setTexture(this._latlonTexture)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_skybox_latlon", this._latlonTexture.textureUnit);
            });

        this._pipeline = new Pipeline(10)
            .cullFace(false, glC.BACK)
            .depthTest(false, glC.LESS)
            .setProgram(createProgram(_vert, _frag))
            .appendSubPipeline(_subPipeCubeLatlon)
            .validate()
    }

    get pipeline(): IPipeline {
        return this._pipeline;
    }

    update(dt: number): void {
    }
}

