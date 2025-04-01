import log from "./log.js";
import glC from "./gl-const.js";
import { geometry } from "./geometry.js"
import shaderAssembler from "./shader-assembler.js"
import {
    Texture,
    Pipeline,
    SubPipeline,
    Framebuffer,
} from "./device-resource.js";
import getProgram from "./program-manager.js"
import {
    IProgram,
    IFramebuffer,
    IPipeline,
    ISubPipeline,
    ITexture,
} from "./types-interfaces.js";

const _vert = `#version 300 es
precision mediump float;
#define SHADER_NAME irradianceBaker
//%%
layout(location = 0) in vec3 a_position;

void main(){
    gl_Position = vec4(a_position, 1.0);
}`;

const _frag = `#version 300 es
precision highp float;
#define SHADER_NAME irradianceBaker
//%%
#define PI2 6.283185307179586
#define PI 3.14159265359
#define PI_OVER_2 1.5707963267948966
#ifdef CUBE
uniform samplerCube u_hdrTexture;
#else
uniform sampler2D u_hdrTexture;
#endif
uniform vec4 u_FBOSize;//xy:size, z:roughness

/**
* result belongs to: (-.5, .5)
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
    return vec2(float(i) / float(N), radicalInverse_VdC(i) + .5);
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

const vec2 invAtan = vec2(0.15915494309189535, 0.3183098861837907);
vec2 directionToUV(const in vec3 dir){
    vec2 uv = vec2(atan(dir.z, dir.x), asin(dir.y));
    uv *= invAtan;
    uv.x += .5;
    uv.y = .5 - uv.y;
    return uv;
}

vec3 PrefilterEnvMap( float Roughness, const in vec3 R ) {
    vec3 N = R;
    vec3 V = R;
    vec3 PrefilteredColor = vec3(0.);
    float TotalWeight = .0;
    const uint NumSamples = uint(1024);

    for( uint i = uint(0); i < NumSamples; i++ ) {
        vec2 Xi = Hammersley( i, NumSamples );
        vec3 H = ImportanceSampleGGX( Xi, Roughness, N );
        vec3 L = reflect(-V, H);
        float NoL = clamp( dot( N, L ), 0., 1.0 );
        if( NoL > 0. ) {
#ifdef CUBE
            vec4 _rgbe= texture(u_hdrTexture, L);
#else
            vec4 _rgbe= texture(u_hdrTexture, directionToUV(L));
#endif
            //_rgbe.rgb *= pow(2.0,_rgbe.a*255.0-128.0);       // unpack RGBE to HDR RGB
            PrefilteredColor += _rgbe.rgb * NoL;
            TotalWeight += NoL;
        }
    }
    return PrefilteredColor / TotalWeight;
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

layout(location=0) out vec4 o_fragColor;
layout(location=1) out vec2 o_brdflut;// R16G16

void main() {
    vec2 a =  gl_FragCoord.xy / u_FBOSize.xy;
    float _phi = a.x * PI2;
    float _theta = a.y * PI;
    vec3 _dir = vec3(sin(_theta) * cos(_phi), cos(_theta), -sin(_theta) * sin(_phi));
    _dir = normalize(_dir);
    o_fragColor = vec4(PrefilterEnvMap(u_FBOSize.z, _dir), 1.0);

    o_brdflut = IntegrateBRDF(a.x, a.y);
}`;

shaderAssembler.registShaderSource("irradianceBaker", _vert, _frag);

export enum SourceType_e {
    EQUIRECTANGULAR = 0,
    CUBE = 1,
};

export default class IrradianceBaker {

    private _irradianceTexture: ITexture;
    private _lutTexture: ITexture;
    private _quad;
    private _pipeline: IPipeline;
    private _subPipe: ISubPipeline;
    private _backFBO: IFramebuffer;
    private _param: number[] = [];

    constructor(width: number, height: number) {
        this._param[0] = width;
        this._param[1] = height;
        this._param[2] = .2;
        this._param[3] = 1.0;
        this._backFBO = new Framebuffer(width, height);
        this._irradianceTexture = new Texture(width, height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
        this._backFBO.attachColorTexture(this._irradianceTexture, 0);
        //this._lutTexture = new Texture(width, height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
        this._lutTexture = new Texture(width, height, glC.RG16F, glC.RG, glC.FLOAT);
        this._backFBO.attachColorTexture(this._lutTexture, 1);

        this._quad = geometry.createFrontQuad();

        this._pipeline = new Pipeline(10000000)
            .drawBuffers(glC.COLOR_ATTACHMENT0, glC.COLOR_ATTACHMENT0 + 1)
            .setFBO(this._backFBO)
            .cullFace(false, glC.BACK)
            .depthTest(false, glC.LESS)
        //@ts-ignore;
        window.baker = this;
    }

    setTexture(texture: ITexture, type: SourceType_e) {
        if (!texture) return;
        const _that = this;
        this._subPipe && this._pipeline.removeSubPipeline(this._subPipe);

        const _subPipeCubeLatlon = new SubPipeline()
            .setRenderObject(this._quad)
            .setTexture(texture)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_hdrTexture", texture.textureUnit);
                program.uploadUniform("u_FBOSize", _that._param);
            });
        const _config = type === SourceType_e.CUBE ? { cube: true } : {};
        this._pipeline.setProgram(getProgram("irradianceBaker", _config))
        this._pipeline.appendSubPipeline(_subPipeCubeLatlon).validate()
        this._subPipe = _subPipeCubeLatlon;
    }

    get irradianceTexture(): ITexture {
        return this._irradianceTexture;
    }

    get lutTexture(): ITexture {
        return this._lutTexture;
    }

    get pixels(): Uint8Array {
        return this._backFBO.readPixels();
    }

    get pipeline(): IPipeline {
        return this._pipeline;
    }

    update(dt: number): void {
    }
}

