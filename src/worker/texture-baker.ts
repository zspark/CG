import { Event_t, default as EventDispatcher, IEventDispatcher } from "../event.js";
import {
    TextureData_t,
} from "../types-interfaces.js";

type BakerParam_t = {
    width: number,
    height: number,
    roughness: number,
    macros: {
        hdr: boolean,
        irradiance: boolean,
    },
    img: TextureData_t,
}

function _worker_logic_() {
    self.onmessage = (event) => {
        const _param: BakerParam_t = event.data;
        const WIDTH = _param.width;
        const HEIGHT = _param.height;
        const img = _param.img;
        const roughness = _param.roughness;
        const macros = _param.macros;

        const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
        const gl: WebGL2RenderingContext = canvas.getContext("webgl2");
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);

        const program = createProgram(gl, macros);
        const uLocSize = gl.getUniformLocation(program, "u_FBOSize");
        const uLocTexture = gl.getUniformLocation(program, "u_hdrTexture");

        const z = 0;
        const vertices = new Float32Array([
            1, 1, z,
            -1, 1, z,
            -1, -1, z,
            //
            -1, -1, z,
            1, -1, z,
            1, 1, z,
        ]);
        const VBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const _texture = createTexture(gl, img);
        const { f: _fbo, t: _colorTexture } = createFBO(gl, WIDTH, HEIGHT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, _fbo);
        gl.viewport(0, 0, WIDTH, HEIGHT);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, _texture);
        gl.uniform1i(uLocTexture, 0);
        gl.uniform4fv(uLocSize, [WIDTH, HEIGHT, roughness, 1.0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 18);

        let pixels = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        console.log("done");
        gl.deleteTexture(_texture);
        gl.deleteTexture(_colorTexture);
        gl.deleteBuffer(VBO);
        gl.deleteFramebuffer(_fbo);
        gl.deleteProgram(program);

        postMessage({ data: pixels, width: WIDTH, height: HEIGHT }, { transfer: [pixels.buffer] })
    };

    function compileProgram(gl: WebGL2RenderingContext, v: string, f: string): WebGLProgram {
        function compileShader(gl: WebGL2RenderingContext, source: string, type: GLenum) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error("[thread]", gl.getShaderInfoLog(shader));
                return null;
            }
            return shader;
        }
        let vertexShader = compileShader(gl, v, gl.VERTEX_SHADER);
        let fragmentShader = compileShader(gl, f, gl.FRAGMENT_SHADER);
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        return program;
    }

    function createProgram(gl: WebGL2RenderingContext, macros: BakerParam_t["macros"]) {
        let _macroString: string = '';
        if (macros.hdr) _macroString += `#define HDR\n`;
        if (macros.irradiance) _macroString += `#define IRRADIANCE\n`;

        const vertexShaderSource = `#version 300 es
precision mediump float;
#define SHADER_NAME texturebaker
//%%
layout(location = 0) in vec3 a_position;

void main(){
    gl_Position = vec4(a_position, 1.0);
}`;

        const fragmentShaderSource = `#version 300 es
precision highp float;
#define SHADER_NAME texturebaker
${_macroString}
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
vec3 PrefilterEnvMap(const in vec3 R, float Roughness) {
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
    int y = int(gl_FragCoord.y);
    if(y == 0){
        _dir = vec3(0., -1., 0.);
    }else if(y == int(u_FBOSize.y) - 1){
        _dir = vec3(0., 1., 0.);
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
    o_environment = vec4(PrefilterEnvMap(_dir, u_FBOSize.z), 1.);
#endif
}`;

        return compileProgram(gl, vertexShaderSource, fragmentShaderSource);
    }

    function createTexture(gl: WebGL2RenderingContext, img: TextureData_t): WebGLTexture {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img.data as any);
        return tex;
    }

    function createFBO(gl: WebGL2RenderingContext, width: number, height: number): { f: WebGLFramebuffer, t: WebGLTexture } {
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

        const textureColor = createTexture(gl, { data: null, width, height, hdr: false });
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureColor, 0);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('[thread] Framebuffer is not complete.');
        }
        return { f: fbo, t: textureColor };
    }
}

export enum BakerType_e {
    IRRADIANCE = 1,
    ENVIRONMENT = 2,
}

export default class TextureBaker extends EventDispatcher {

    static EVT_BAKED: number = 1;

    private _worker: Worker;
    private _parameter: BakerParam_t;

    constructor() {
        super();

        const workerBlob = new Blob([`(${_worker_logic_.toString()})()`], { type: "application/javascript" });
        const workerUrl = URL.createObjectURL(workerBlob);
        this._worker = new Worker(workerUrl, { type: "module" });
        this._parameter = {
            width: 512,
            height: 256,
            roughness: .2,
            macros: {
                hdr: false,
                irradiance: false,
            },
            img: undefined,
        }
    }

    bake(type: BakerType_e, img: TextureData_t, roughness: number, clone: boolean = false): Promise<TextureData_t> {
        const _img = clone ? this._copyData(img) : img;
        this._parameter.img = _img;
        this._parameter.roughness = roughness;
        this._parameter.macros.hdr = _img.hdr;
        this._parameter.macros.irradiance = type === BakerType_e.IRRADIANCE;
        this._worker.postMessage(this._parameter, [(_img.data as Uint8ClampedArray).buffer]);
        return new Promise((d, f) => {
            this._worker.onmessage = (event) => {
                const img: TextureData_t = event.data;
                d(img);
            }
        });
    }

    private _copyData(img: TextureData_t): TextureData_t {
        const _ab = new ArrayBuffer((img.data as Uint8ClampedArray).byteLength);
        const sharedView = new Uint8ClampedArray(_ab);
        sharedView.set(img.data as Uint8ClampedArray);
        return {
            width: img.width,
            height: img.height,
            data: sharedView,
            hdr: img.hdr,
        };
    }
}

