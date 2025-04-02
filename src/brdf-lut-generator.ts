import log from "./log.js";
import glC from "./gl-const.js";
import { geometry } from "./geometry.js"
import shaderAssembler from "./shader-assembler.js"
import getProgram from "./program-manager.js"
import Environment from "./environment.js";
import {
    Texture,
    Pipeline,
    SubPipeline,
    Framebuffer,
} from "./device-resource.js";
import {
    IProgram,
    IFramebuffer,
    IPipeline,
    ISubPipeline,
    ITexture,
} from "./types-interfaces.js";

const _vert = `#version 300 es
precision mediump float;
#define SHADER_NAME brdflut
//%%
layout(location = 0) in vec3 a_position;

void main(){
    gl_Position = vec4(a_position, 1.0);
}`;

const _frag = `#version 300 es
precision highp float;
#define SHADER_NAME brdflut
//%%
#define PI2 6.283185307179586
#define PI 3.14159265359
#define PI_OVER_2 1.5707963267948966
uniform vec2 u_FBOSize;//xy:size

/**
* result belongs to: (0.0, 1.0)
*/
float radicalInverse_VdC(uint bits) {
    bits = (bits << 16u) | (bits >> 16u);
    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
    return float(bits) * 2.3283064365386963e-10; // 1 / 2^32
}

vec2 Hammersley(uint i, uint N) {
    return vec2(float(i) / float(N), radicalInverse_VdC(i));
}

vec3 ImportanceSampleGGX(const in vec2 Xi, float Roughness, const in vec3 N ) {
    float a = Roughness * Roughness;
    float Phi = PI2 * Xi.x;
    float CosTheta = sqrt( (1. - Xi.y) / ( 1. + (a*a - 1.) * Xi.y ) );
    float SinTheta = sqrt( 1. - CosTheta * CosTheta );
    vec3 H;
    H.x = SinTheta * cos( Phi );
    H.y = SinTheta * sin( Phi );
    H.z = CosTheta;
    vec3 UpVector = abs(N.z) < 0.999 ? vec3(0.,0.,1.) : vec3(1.,0.,0.);
    vec3 TangentX = normalize( cross( UpVector, N ) );
    vec3 TangentY = cross( N, TangentX );
    // Tangent to world space
    return TangentX * H.x + TangentY * H.y + N * H.z;
}

float _geometry(float ndotv, float roughness) {
    float k = roughness * roughness / 2.0;
    return ndotv / (ndotv * (1.0 - k) + k);
}

float G_Smith( float roughness, float ndotv, float ndotl){
    return _geometry(ndotv, roughness) * _geometry(ndotl, roughness);
}

const vec3 _normal = vec3(.0, .0, 1.);
vec2 IntegrateBRDF(float NoV,  float Roughness){
    vec3 V;
    V.x = sqrt( 1.0f - NoV * NoV ); // sin
    V.y = 0.;
    V.z = NoV; // cos
    float A = 0.;
    float B = 0.;
    const uint NumSamples = uint(1024);
    for( uint i = uint(0); i < NumSamples; i++ ) {
        vec2 Xi = Hammersley( i, NumSamples );
        vec3 H = ImportanceSampleGGX( Xi, Roughness, _normal);
        vec3 L = reflect(-V, H);
        float NoL = clamp( L.z, .0, 1. );
        float NoH = clamp( H.z, .0, 1. );
        float VoH = clamp( dot( V, H ), .0, 1. );
        if( NoL > 0. ) {
            float G = G_Smith( Roughness, NoV, NoL );
            float G_Vis = G * VoH / (NoH * NoV);
            float Fc = pow( 1. - VoH, 5. );
            A += (1. - Fc) * G_Vis;
            B += Fc * G_Vis;
        }
    }
    return vec2( A, B ) / float(NumSamples);
}

#ifdef RG16F
out vec2 o_brdflut;
#endif

#ifdef RGB
out vec3 o_brdflut;
#endif

void main() {
    vec2 a =  gl_FragCoord.xy / u_FBOSize;
#ifdef RG16F
    o_brdflut = IntegrateBRDF(a.x, a.y);
#endif
#ifdef RGB
    o_brdflut = vec3(IntegrateBRDF(a.x, a.y), 0.);
#endif
}`;

shaderAssembler.registShaderSource("brdflut", _vert, _frag);

export default class BRDFLutGenerator {

    private _quad;
    private _pipeline: IPipeline;
    private _backFBO: IFramebuffer;
    private _brdfLutTexture: ITexture;

    constructor(iformat: GLenum = glC.RG16F, format: GLenum = glC.RG, type: GLenum = glC.FLOAT, width: number = 512, height: number = 512) {
        this._brdfLutTexture = new Texture(width, height, iformat, format, type);
        this._backFBO = new Framebuffer(width, height);
        this._backFBO.attachColorTexture(this._brdfLutTexture, 0);

        this._quad = geometry.createFrontQuad();

        const _config = {
            RG16F: iformat === glC.RG16F,
            RGB: iformat === glC.RGB,
        }
        this._pipeline = new Pipeline(10000000)
            .setFBO(this._backFBO)
            .cullFace(false, glC.BACK)
            .depthTest(false, glC.LESS)
            .setProgram(getProgram("brdflut", _config))
            .appendSubPipeline(new SubPipeline()
                .setRenderObject(this._quad)
                .setUniformUpdaterFn((program: IProgram) => {
                    program.uploadUniform("u_FBOSize", [width, height]);
                }))
            .validate();

        //@ts-ignore
        window.brdflut = this;
    }

    get BRDFLutTexture(): ITexture {
        return this._brdfLutTexture;
    }

    get pipeline(): IPipeline {
        return this._pipeline;
    }

    update(dt: number): void {
    }
}

