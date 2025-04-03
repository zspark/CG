import log from "./log.js";
import glC from "./gl-const.js";
import { geometry } from "./geometry.js"
import shaderAssembler from "./shader-assembler.js"
import getProgram from "./program-manager.js"
import { Event_t, default as EventDispatcher, IEventDispatcher } from "./event.js";
import {
    Texture,
    Pipeline,
    SubPipeline,
    Framebuffer,
} from "./device-resource.js";
import {
    IRenderer,
    IProgram,
    IFramebuffer,
    IPipeline,
    ISubPipeline,
    ITexture,
} from "./types-interfaces.js";

const _vert = `#version 300 es
precision mediump float;
#define SHADER_NAME texturebaker
//%%
layout(location = 0) in vec3 a_position;

void main(){
    gl_Position = vec4(a_position, 1.0);
}`;

const _frag = `#version 300 es
precision highp float;
#define SHADER_NAME texturebaker
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
    uv.y = 1.0 - uv.y;
    return uv;
}

vec3 _getTextureColor(const in vec3 dir){
#ifdef CUBE
    vec4 _rgbe= texture(u_hdrTexture, dir);
#else
    vec4 _rgbe= texture(u_hdrTexture, directionToUV(dir));
#endif

#ifdef HDR
    _rgbe.rgb *= pow(2.0, _rgbe.a * 255.0 - 128.0);       // unpack RGBE to HDR RGB
#endif
    return _rgbe.rgb;
}

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

#ifdef IRRADIANCE
vec3 GenIrridanceMap(const in vec3 normalW){
    vec3 irradiance = vec3(0.0);

    vec3 up    = normalW.z<0.999?vec3(0.0, 0.0, 1.0):vec3(0., 1., 0.);
    vec3 right = normalize(cross(up, normalW));
    up         = normalize(cross(normalW, right));

    float sampleDelta = 0.025;
    uint nrSamples = uint(0);
    for(float phi = 0.0; phi < 2.0 * PI; phi += sampleDelta) {
        for(float theta = 0.0; theta < 0.5 * PI; theta += sampleDelta) {
            // spherical to cartesian (in tangent space)
            vec3 tangentSample = vec3(sin(theta) * cos(phi),  sin(theta) * sin(phi), cos(theta));
            // tangent space to world
            vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * normalW;

            vec3 _color = _getTextureColor(sampleVec);
            irradiance += _color * cos(theta) * sin(theta);

            nrSamples++;
        }
    }
    irradiance = PI * irradiance / float(nrSamples);
    return irradiance;
}
#else
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
            vec3 _color = _getTextureColor(L);
            PrefilteredColor += _color * NoL;
            TotalWeight += NoL;
        }
    }
    return PrefilteredColor / TotalWeight;
}
#endif

#ifdef IRRADIANCE
layout(location=0) out vec4 o_irradiance;
#else
layout(location=0) out vec4 o_environment;
#endif

void main() {
    vec3 _dir;
    ivec2 c = ivec2(int(gl_FragCoord.x), int(gl_FragCoord.y));
    if(c.y==0){
        _dir = vec3(0.,-1.,0.);
    }else if(c.y==int(u_FBOSize.y)-1){
        _dir = vec3(0.,1.,0.);
    }else{
        vec2 a =  gl_FragCoord.xy / u_FBOSize.xy;
        float _phi = a.x * PI2;
        float _theta = (1. - a.y) * PI;
        _dir = vec3(sin(_theta) * cos(_phi), cos(_theta), sin(_theta) * sin(_phi));
    }
    _dir = normalize(_dir);

#ifdef IRRADIANCE
    o_irradiance = vec4(GenIrridanceMap(_dir), 1.);
#else
    o_environment = vec4(PrefilterEnvMap(u_FBOSize.z, _dir), 1.0);
#endif
}`;

shaderAssembler.registShaderSource("texture-baker", _vert, _frag);

export enum BakerType_e {
    IRRADIANCE = 1,
    ENVIRONMENT = 2,
}

export default class TextureBaker extends EventDispatcher {

    static EVT_BAKED: number = 1;

    private _quad;
    private _pipeline: IPipeline;
    private _subPipe: ISubPipeline;
    private _backFBO: IFramebuffer;
    private _program: IProgram;
    private _param: number[] = [];
    private _sourceTexture: ITexture;
    private _targetTexture: ITexture;

    constructor(type: BakerType_e, sourceTexture: ITexture, targetTexture: ITexture, roughness: number = .2) {
        super();
        this._sourceTexture = sourceTexture;
        this._targetTexture = targetTexture;
        const { width, height } = targetTexture;
        this._param[0] = width;
        this._param[1] = height;
        this._param[2] = roughness;
        this._param[3] = 1.0;
        this._backFBO = new Framebuffer(width, height);
        this._backFBO.attachColorTexture(targetTexture, 0);

        this._quad = geometry.createFrontQuad();
        const _config = {
            hdr: sourceTexture.isHDRData,
            cube: sourceTexture.target === glC.TEXTURE_CUBE_MAP,
            irradiance: type === BakerType_e.IRRADIANCE,
        }

        const _subPipeCubeLatlon = new SubPipeline()
            .setRenderObject(this._quad)
            .setTexture(sourceTexture)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_hdrTexture", sourceTexture.textureUnit);
                program.uploadUniform("u_FBOSize", this._param);
            });
        this._subPipe = _subPipeCubeLatlon;

        this._program = getProgram("texture-baker", _config)
        this._pipeline = new Pipeline(10000000, "texture-baker")
            .setFBO(this._backFBO)
            .cullFace(false, glC.BACK)
            .depthTest(false, glC.LESS)
            .setProgram(this._program)
            .appendSubPipeline(_subPipeCubeLatlon).validate()
            .setAfterExecuteCallbackFn((renderer: IRenderer) => {
                log.info("[TextureBaker] texture baked.");
                renderer.removePipeline(this._pipeline);
                this._broadcast({
                    sender: this,
                    type: TextureBaker.EVT_BAKED,
                });
                this._backFBO.destroy();
                //this._program.destroy();
                this._clearReceivers(TextureBaker.EVT_BAKED);
            })
            .validate();

        //@ts-ignore;
        window.irradianceBaker = this;
    }

    copyDataToTexture(texture: ITexture, level: number): void {
        this._backFBO.copyColorAttachmentToTexture(0, texture, level);
    }

    get sourceTexture(): ITexture {
        return this._sourceTexture;
    }

    get targetTexture(): ITexture {
        return this._targetTexture;
    }

    get pipeline(): IPipeline {
        return this._pipeline;
    }
}

