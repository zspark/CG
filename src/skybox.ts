import log from "./log.js";
import glC from "./gl-const.js";
import { geometry } from "./geometry.js"
import shaderAssembler from "./shader-assembler.js"
import getProgram from "./program-manager.js"
import {
    Pipeline,
    SubPipeline,
    Texture,
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
precision mediump float;
#define SHADER_NAME skybox
//%%
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
precision mediump float;
#define SHADER_NAME skybox
//%%
uniform samplerCube u_skyboxTexture;
out vec4 o_fragColor;
in vec3 v_uvSkybox;
void main() {
    vec4 _rgbe = texture(u_skyboxTexture, v_uvSkybox);
#ifdef HDR
    _rgbe.rgb *= pow(2.0, _rgbe.a * 255.0 - 128.0);       // unpack RGBE to HDR RGB
#endif
    o_fragColor = vec4(_rgbe.rgb, 1.0);
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

shaderAssembler.registShaderSource("skybox", _skybox);

export default class Skybox {

    private _cubeTexture: ITexture;
    private _box: IGeometry;
    private _pipeline;
    private _subpipeline: ISubPipeline;

    constructor(hdr: boolean = false) {
        this._box = geometry.createCube(50);
        this._cubeTexture = new Texture(512, 512);
        this._cubeTexture.target = glC.TEXTURE_CUBE_MAP;

        this._subpipeline = new SubPipeline()
            .setRenderObject(this._box)
            .setTexture(this._cubeTexture)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_skyboxTexture", this._cubeTexture.textureUnit);
            });

        this._pipeline = new Pipeline(9)
            .cullFace(true, glC.FRONT)
            .depthTest(false, glC.LESS)
            .blend(false, glC.SRC_ALPHA, glC.ONE_MINUS_SRC_ALPHA, glC.FUNC_ADD)
            .appendSubPipeline(this._subpipeline)

        this.hdr = hdr;
    }

    set hdr(value: boolean) {
        const _config = { hdr: value };
        this._pipeline
            .setProgram(getProgram("skybox", _config))
            .validate()
    }

    get pipeline(): IPipeline {
        return this._pipeline;
    }

    get cubeTexture(): ITexture {
        return this._cubeTexture;
    }

    update(dt: number): void {
    }
}

