import { log, warn } from "../log.js";
import { float32ArrayToRGB9E5, float32ToRGB9E5 } from "../rgb9e5-converter.js";
import { Event_t, default as EventDispatcher, IEventDispatcher } from "../event.js";
import {
    TextureData_t,
} from "../types-interfaces.js";

export type BakerOption_t = {
    width: number,
    height: number,
    roughness: number,
    img: TextureData_t,
};

type BakerParam_t = {
    maxLevel: number,
    macros: {
        hdr: boolean,
        irradiance: boolean,
        tone_mapping: boolean,
    },
} & BakerOption_t;

function _worker_logic_() {
    self.onmessage = (event) => {
        const _param: BakerParam_t = event.data;
        const WIDTH = _param.width;
        const HEIGHT = _param.height;
        const img = _param.img;
        const roughness = _param.roughness;
        const maxLevel = _param.maxLevel;
        const macros = _param.macros;

        const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
        const gl: WebGL2RenderingContext = canvas.getContext("webgl2");
        const ext = gl.getExtension('EXT_color_buffer_float');
        if (!ext) {
            console.error("[thread, texturebaker] Extension not supported.");
        }
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);

        let program = createProgram(gl, macros);
        let uLocSize = gl.getUniformLocation(program, "u_FBOSize");
        let uLocTexture = gl.getUniformLocation(program, "u_hdrTexture");

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


        //debugger;
        const _od: Uint8ClampedArray = img.data as Uint8ClampedArray;
        let _data = new Float32Array(img.width * img.height * 4);
        for (let j = 0; j < img.height; ++j) {
            for (let i = 0; i < img.width; ++i) {
                let _index = (j * img.width + i) * 4;
                let _a = _od[_index + 3];
                let _f = Math.pow(2, _a - 128.) / 255.;
                _data[_index + 0] = _od[_index + 0] * _f;
                _data[_index + 1] = _od[_index + 1] * _f;
                _data[_index + 2] = _od[_index + 2] * _f;
                _data[_index + 3] = 1.0;
            }
        }
        img.data = _data;
        const _datas: TextureData_t[] = generateMipmapDataFloat32(img.width, img.height, img.data);
        const _texture = createTexture(gl, img, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        for (let i = 1; i < _datas.length; ++i) {
            let _img = _datas[i];
            gl.texImage2D(gl.TEXTURE_2D, i, gl.RGBA16F, _img.width, _img.height, 0, gl.RGBA, gl.FLOAT, _img.data as any);
        }


        let _out = createFBO(gl, WIDTH, HEIGHT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, _out.f);
        gl.viewport(0, 0, WIDTH, HEIGHT);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, _texture);
        gl.uniform1i(uLocTexture, 0);
        gl.uniform4fv(uLocSize, [WIDTH, HEIGHT, roughness, maxLevel]);
        gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 18);

        let pixels = new Float32Array(WIDTH * HEIGHT * 4);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.FLOAT, pixels);
        //@ts-ignore
        pixels = float32ArrayToRGB9E5(pixels);

        gl.deleteTexture(_texture);
        gl.deleteProgram(program);
        gl.deleteBuffer(VBO);
        gl.deleteTexture(_out.t);
        gl.deleteFramebuffer(_out.f);

        postMessage({ data: pixels, width: WIDTH, height: HEIGHT }, { transfer: [pixels.buffer] })
        log("done");
        return;

        /*

        /// blur;
        program = createBlurProgram(gl);
        uLocSize = gl.getUniformLocation(program, "u_FBOSize");
        uLocTexture = gl.getUniformLocation(program, "u_texture");
        const _out2 = createFBO(gl, WIDTH, HEIGHT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, _out2.f);
        gl.viewport(0, 0, WIDTH, HEIGHT);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, _out.t);
        gl.uniform1i(uLocTexture, 0);
        gl.uniform4fv(uLocSize, [WIDTH, HEIGHT, roughness, 1.0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 18);

        let _pixels = new Float32Array(WIDTH * HEIGHT * 4);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.FLOAT, _pixels);

        log("done");
        gl.deleteBuffer(VBO);
        gl.deleteTexture(_out.t);
        gl.deleteFramebuffer(_out.f);
        gl.deleteTexture(_out2.t);
        gl.deleteFramebuffer(_out2.f);
        gl.deleteProgram(program);

        postMessage({ data: _pixels, width: WIDTH, height: HEIGHT }, { transfer: [_pixels.buffer] })
        */
    };

    function generateMipmapDataFloat32(width: number, height: number, data: Float32Array): TextureData_t[] {
        if (width <= 0 || height <= 0) throw new Error("Invalid texture size");
        if (data.length !== width * height * 4) throw new Error("Invalid texture data size");

        let mipmaps: TextureData_t[] = [];
        let currentWidth = width;
        let currentHeight = height;
        let currentData = new Float32Array(data);

        mipmaps.push({ width, height, data: currentData, hdr: true }); // Level 0 (原始数据)

        while (currentWidth > 1 || currentHeight > 1) {
            let newWidth = Math.max(1, currentWidth >> 1);
            let newHeight = Math.max(1, currentHeight >> 1);
            let newData = new Float32Array(newWidth * newHeight * 4);

            for (let y = 0; y < newHeight; y++) {
                for (let x = 0; x < newWidth; x++) {
                    let i = (y * 2 * currentWidth + x * 2) * 4;
                    let j = i + 4, k = i + currentWidth * 4, l = k + 4;

                    for (let c = 0; c < 4; c++) { // 处理 RGBA 4 通道
                        let aa = currentData[i + c] ?? 1;
                        let bb = currentData[j + c] ?? 1;
                        let cc = currentData[k + c] ?? 1;
                        let dd = currentData[l + c] ?? 1;
                        newData[(y * newWidth + x) * 4 + c] = (aa + bb + cc + dd) * .25;
                    }
                }
            }

            mipmaps.push({ width: newWidth, height: newHeight, data: newData, hdr: true });
            currentData = newData;
            currentWidth = newWidth;
            currentHeight = newHeight;
        }

        return mipmaps;
    }

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
        if (macros.tone_mapping) _macroString += `#define TONE_MAPPING\n`;
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
#define ONE_OVER_PI 0.3183098861837907
#ifdef CUBE
uniform samplerCube u_hdrTexture;
#else
uniform sampler2D u_hdrTexture;
#endif
uniform vec4 u_FBOSize;//xy:size, z:roughness, w:max LOD;

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

vec3 CoordToDirection(const in vec2 coord){

    vec3 _dir;
    int y = int(coord.y);
    if(y == 0){
        _dir = vec3(0., -1., 0.);
    }else if(y == int(u_FBOSize.y) - 1){
        _dir = vec3(0., 1., 0.);
    }else{
        vec2 uv = coord/u_FBOSize.xy;
        float _phi = uv.x * PI2;
        float _theta = (1. - uv.y) * PI;
        _dir = vec3(sin(_theta) * cos(_phi), cos(_theta), sin(_theta) * sin(_phi));
    }
    _dir = normalize(_dir);
    return _dir;
}

vec3 _getTextureColor(const in vec3 dir, float lod){
#ifdef CUBE
    vec4 _rgbe= texture(u_hdrTexture, dir);
#else
    vec2 _uv = directionToUV(dir);
    #ifdef IRRADIANCE
        float _floor = floor(lod);
        vec4 _rgbea = textureLod(u_hdrTexture, _uv, _floor);
        vec4 _rgbeb = textureLod(u_hdrTexture, _uv, _floor + 1.);
        vec4 _rgbe = mix(_rgbea, _rgbeb, lod - _floor);
    #else
        vec4 _rgbe = textureLod(u_hdrTexture, _uv, lod);
        _rgbe.rgb = clamp(_rgbe.rgb, vec3(0.), vec3(1.));
    #endif
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

    vec3 up = normalW.z < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(0., 1., 0.);
    vec3 right = normalize(cross(up, normalW));
    up = normalize(cross(normalW, right));

    float sampleDelta = 0.025;
    uint nrSamples = uint(0);
    for(float theta = 0.0; theta < PI_OVER_2; theta += sampleDelta) {
        float cosTheta = cos(theta);
        float sinTheta = sin(theta);
        for(float phi = 0.0; phi < PI2; phi += sampleDelta) {
            vec3 sampleVec = sinTheta * cos(phi) * right + sinTheta * sin(phi) * up + cosTheta * normalW;
            float _lod = u_FBOSize.w * (1. - pow(cosTheta, .1)) + 1.;
            vec3 _color = _getTextureColor(sampleVec, _lod);
            irradiance += _color * cosTheta * sin(theta);

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
            vec3 _color = _getTextureColor(L, 0.);
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
    vec3 _dir = CoordToDirection(gl_FragCoord.xy);

#ifdef IRRADIANCE
    o_irradiance = vec4(GenIrridanceMap(_dir), 1.3);
#else
    o_environment = vec4(PrefilterEnvMap(_dir, u_FBOSize.z), 1.);
#endif
}`;

        return compileProgram(gl, vertexShaderSource, fragmentShaderSource);
    }

    function createBlurProgram(gl: WebGL2RenderingContext) {

        const vertexShaderSource = `#version 300 es
precision mediump float;
#define SHADER_NAME gaussian_blur
//%%
layout(location = 0) in vec3 a_position;

void main(){
    gl_Position = vec4(a_position, 1.0);
}`;

        const fragmentShaderSource = `#version 300 es
precision highp float;
#define SHADER_NAME gaussian_blur
out vec4 o_FragColor;

uniform sampler2D u_texture;
uniform vec4 u_FBOSize;//xy:size, z:roughness

/*
const float kernel[25] = float[25](
    1.0 / 273.0,  4.0 / 273.0,  7.0 / 273.0,  4.0 / 273.0,  1.0 / 273.0,
    4.0 / 273.0, 16.0 / 273.0, 26.0 / 273.0, 16.0 / 273.0,  4.0 / 273.0,
    7.0 / 273.0, 26.0 / 273.0, 41.0 / 273.0, 26.0 / 273.0,  7.0 / 273.0,
    4.0 / 273.0, 16.0 / 273.0, 26.0 / 273.0, 16.0 / 273.0,  4.0 / 273.0,
    1.0 / 273.0,  4.0 / 273.0,  7.0 / 273.0,  4.0 / 273.0,  1.0 / 273.0
);
*/

const float kernel[9] = float[9](
    1.0 / 16.0, 2.0 / 16.0, 1.0 / 16.0,
    2.0 / 16.0, 4.0 / 16.0, 2.0 / 16.0,
    1.0 / 16.0, 2.0 / 16.0, 1.0 / 16.0
);

void main() {
    vec2 texOffset = 1.0 / u_FBOSize.xy;
    //vec2 TexCoords = gl_FragCoord.xy * texOffset;
    //TexCoords.y = 1.0 - TexCoords.y;
    vec3 result = vec3(0.0);

    for(int i = -1; i <= 1; i++) {
        float _i = float(i);
        for(int j = -1; j <= 1; j++) {
            float _j = float(j);
            vec3 color = texture(u_texture, (gl_FragCoord.xy + vec2(_i, _j)) * texOffset).rgb;
            result += color * kernel[(i+1) * 3 + (j+1)];
        }
    }

    o_FragColor = vec4(result, 2.0);
}`;
        return compileProgram(gl, vertexShaderSource, fragmentShaderSource);
    }

    function createTexture(gl: WebGL2RenderingContext, img: TextureData_t, rgba32f: boolean): WebGLTexture {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);//vital: NEAREST is very important for rgba32f texture;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (rgba32f) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, img.width, img.height, 0, gl.RGBA, gl.FLOAT, img.data as any);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img.data as any);
        }
        return tex;
    }

    function createFBO(gl: WebGL2RenderingContext, width: number, height: number): { f: WebGLFramebuffer, t: WebGLTexture } {
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

        const textureColor = createTexture(gl, { data: null, width, height, hdr: false }, true);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureColor, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

        if (status != gl.FRAMEBUFFER_COMPLETE) {
            switch (status) {
                case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                    log("[Framebuffer] attachment is incomplete.");
                    break;
                case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                    log("[Framebuffer] missing attachment.");
                    break;
                case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                    log("[Framebuffer] attachments have different dimensions.");
                    break;
                case gl.FRAMEBUFFER_UNSUPPORTED:
                    log("[Framebuffer] unsupported combination of attachments.");
                    break;
                default:
                    log("[Framebuffer] Unknown error.");
                    break;
            }
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

        const workerBlob = new Blob([
            `${float32ToRGB9E5.toString()}`,
            `${float32ArrayToRGB9E5.toString()}`,
            `${log.toString()}`,
            `(${_worker_logic_.toString()})()`],
            { type: "application/javascript" });
        const workerUrl = URL.createObjectURL(workerBlob);
        this._worker = new Worker(workerUrl, { type: "module" });
        this._parameter = {
            width: 256,
            height: 128,
            roughness: .2,
            maxLevel: 1,
            macros: {
                tone_mapping: false,
                hdr: false,
                irradiance: false,
            },
            img: undefined,
        }
    }

    bake(type: BakerType_e, options: BakerOption_t, clone: boolean = false, tonM: boolean = false): Promise<TextureData_t> {
        const _img = clone ? this._copyData(options.img) : options.img;
        this._parameter.img = _img;
        this._parameter.roughness = options.roughness;
        this._parameter.width = options.width;
        this._parameter.height = options.height;
        this._parameter.maxLevel = Math.log2(Math.max(options.img.width, options.img.height)) + 1;
        this._parameter.macros.hdr = _img.hdr;
        this._parameter.macros.tone_mapping = tonM;
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

