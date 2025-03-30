import log from "./log.js";
import glC from "./gl-const.js";
import { geometry } from "./geometry.js"
import {
    Texture,
    Pipeline,
    SubPipeline,
    Framebuffer,
} from "./device-resource.js";
import { createProgram } from "./program-manager.js"
import {
    IProgram,
    IFramebuffer,
    IPipeline,
    ITexture,
} from "./types-interfaces.js";
import { Loader, TextureData_t } from "./assets-loader.js";

const _vert = `#version 300 es
#define SHADER_NAME irradianceBaker
precision mediump float;
layout(location = 0) in vec3 a_position;

void main(){
    gl_Position = vec4(a_position, 1.0);
}`;

const _frag = `#version 300 es
#define SHADER_NAME irradianceBaker
precision highp float;
#define PI2 6.283185307179586
#define PI 3.14159265359
#define PI_OVER_2 1.5707963267948966
uniform sampler2D u_hdrTexture;
uniform vec4 u_FBOSize;//xy:size, z:roughness

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
        vec3 L = reflect(V, H); //vec3 L = 2. * dot( V, H ) * H - V;
        float NoL = clamp( dot( N, L ), 0., 1.0 );
        if( NoL > 0. ) {
            //PrefilteredColor += EnvMap.SampleLevel( EnvMapSampler, L, 0 ).rgb * NoL;

            vec4 _rgbe= texture(u_hdrTexture, directionToUV(L));
            //_rgbe.rgb *= pow(2.0,_rgbe.a*255.0-128.0);       // unpack RGBE to HDR RGB
            PrefilteredColor += _rgbe.rgb * NoL;
            TotalWeight += NoL;
        }
    }
    return PrefilteredColor / TotalWeight;
}

out vec4 o_fragColor;

void main() {
    vec2 a =  gl_FragCoord.xy / u_FBOSize.xy;
    float _phi = a.x * PI2;
    float _theta = a.y * PI;
    vec3 _dir = vec3(sin(_theta) * cos(_phi), cos(_theta), sin(_theta) * sin(_phi));
    _dir = normalize(_dir);
    o_fragColor = vec4(PrefilterEnvMap(u_FBOSize.z, _dir), 1.0);
}`;

export default class IrradianceBaker {

    private _hdrTexture: ITexture;
    private _irradianceTexture: ITexture;
    private _quad;
    private _pipeline;
    private _backFBO: IFramebuffer;
    private _ready: boolean = false;

    constructor(hdrEnvironmentUrl: string, width: number, height: number) {
        this._backFBO = new Framebuffer(width, height);
        this._irradianceTexture = new Texture(width, height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
        this._backFBO.attachColorTexture(this._irradianceTexture, 0);

        Loader.loadTexture(hdrEnvironmentUrl).then((img: TextureData_t) => {
            this._hdrTexture = new Texture(img.width, img.height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
            this._hdrTexture.setParameter(glC.TEXTURE_MIN_FILTER, glC.LINEAR);
            this._hdrTexture.setParameter(glC.TEXTURE_MAG_FILTER, glC.LINEAR);
            this._hdrTexture.data = img.data;
            const _subPipeCubeLatlon = new SubPipeline()
                .setRenderObject(this._quad)
                .setTexture(this._hdrTexture)
                .setUniformUpdaterFn((program: IProgram) => {
                    program.uploadUniform("u_hdrTexture", this._hdrTexture.textureUnit);
                    program.uploadUniform("u_FBOSize", [width, height, 0.4, 1.0]);
                });
            this._pipeline.appendSubPipeline(_subPipeCubeLatlon);
            this._ready = true;
        });

        this._quad = geometry.createFrontQuad();

        this._pipeline = new Pipeline(10000000)
            .setFBO(this._backFBO)
            .cullFace(false, glC.BACK)
            .depthTest(false, glC.LESS)
            .setProgram(createProgram(_vert, _frag))
            .validate()

        //@ts-ignore;
        window.baker = this;
    }

    get ready(): boolean {
        return this._ready;
    }

    get irradianceTexture(): ITexture {
        return this._irradianceTexture;
    }

    get pixels(): Uint8Array {
        return this._backFBO.readPixels();
    }

    get pipeline(): IPipeline {
        this._ready = false;
        return this._pipeline;
    }

    update(dt: number): void {
    }
}

