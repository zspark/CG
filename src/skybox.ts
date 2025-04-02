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
    vec3 a = mat3(u_vMatrix) * a_position;
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
precision mediump float;
#define SHADER_NAME equirectangular
//%%
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
precision mediump float;
#define SHADER_NAME equirectangular
//%%
#define PI2 6.283185307179586
#define PI 3.14159265359
uniform sampler2D u_skybox_latlon;

in vec3 v_rayDirection;
out vec4 o_fragColor;

const vec2 invAtan = vec2(0.15915494309189535, 0.3183098861837907);
vec2 directionToUV(const in vec3 dir){
    // atan(y,x): (-PI  , PI  );
    // atan(y/x): (-PI/2, PI/2);
    // acos(v)  : (0    , 2PI );
    vec2 uv = vec2(atan(dir.z, dir.x), acos(dir.y));
    uv *= invAtan;
    if( uv.x < 0. ){
        uv.x = 1. + uv.x;
    }
    return uv;
}

void main() {
    vec3 rayDir = normalize(v_rayDirection);
    vec2 _uv = directionToUV(rayDir);
    o_fragColor = texture(u_skybox_latlon, _uv);
}`
];

shaderAssembler.registShaderSource("skybox", _skybox);
shaderAssembler.registShaderSource("equirectangular", _equirectangular);

export default class Skybox {

    private _cubeTexture: ITexture;
    private _box: IGeometry;
    private _plane: IGeometry;
    private _pipeline: IPipeline;
    private _subpipeline: ISubPipeline;

    constructor(hdr: boolean = false, equirectangularTexture?: ITexture) {

        this._pipeline = new Pipeline(9)
            .depthTest(false, glC.LESS)
            .blend(false, glC.SRC_ALPHA, glC.ONE_MINUS_SRC_ALPHA, glC.FUNC_ADD)

        const _config = { hdr };
        if (!equirectangularTexture) {
            this._cubeTexture = new Texture(512, 512);
            this._cubeTexture.target = glC.TEXTURE_CUBE_MAP;

            this._box = geometry.createCube(50);
            this._subpipeline = new SubPipeline()
                .setRenderObject(this._box)
                .setTexture(this._cubeTexture)
                .setUniformUpdaterFn((program: IProgram) => {
                    program.uploadUniform("u_skyboxTexture", this._cubeTexture.textureUnit);
                });
            this._pipeline
                .cullFace(true, glC.FRONT)
                .setProgram(getProgram("skybox", _config))
                .appendSubPipeline(this._subpipeline)
                .validate()
        } else {
            this._cubeTexture = equirectangularTexture;

            this._plane = geometry.createFrontQuad();
            this._subpipeline = new SubPipeline()
                .setRenderObject(this._plane)
                .setTexture(this._cubeTexture)
                .setUniformUpdaterFn((program: IProgram) => {
                    program.uploadUniform("u_skybox_latlon", this._cubeTexture.textureUnit);
                });
            this._pipeline
                .setProgram(getProgram("equirectangular", _config))
                .appendSubPipeline(this._subpipeline)
                .validate()
        }
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

