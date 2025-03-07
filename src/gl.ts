import log from "./log.js"
import { default as glC, initGLConstant } from "./gl-const.js"
import { IGeometry } from "./geometry.js";


export function createGLContext(canvasElementId: string): WebGL2RenderingContext {
    const canvas: HTMLCanvasElement = document.getElementById(canvasElementId) as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2', { stencil: true });
    if (!gl) {
        log.vital("[createGLContent] WebGL 2.0 not supported!");
    }
    initGLConstant(gl);
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (ext) {
        log.info("[createGLContent] Extension enabled: EXT_color_buffer_float\n", ext);
    } else {
        log.warn("[createGLContent] Extension not supported.");
    }
    //@ts-ignore
    window.gl = gl;// debug use;
    return gl;
}

type BufferData_t = AllowSharedBufferSource & {
    length: number;
};

type AttributeLayout_t = {
    shaderLocation: ShaderLocation_e,
    //format: VertexFormat_e;
    size: number,
    type: number,
    normalized: boolean,
    offset: number,
};
type BufferLayout_t = {
    attributes: AttributeLayout_t[],
    stride: GLsizei,
    stepMode: StepMode_e,
};

/*
enum VertexFormat_e {
    //https://gpuweb.github.io/gpuweb/#enumdef-gpuvertexformat
    float32x4 = "float32x4",
    float32x3 = "float32x3",
    float32x2 = "float32x2",
};

enum IndexFormat_e {
    uint16 = "uint16",
    uint32 = "uint32",
};
*/

export enum StepMode_e {
    vertex = "vertex",
    instance = "instance",
};

export enum ShaderLocation_e {
    ATTRIB_POSITION = 0,
    ATTRIB_TEXTURE_UV = 1,
    ATTRIB_NORMAL = 2,
    ATTRIB_COLOR = 3,
    ATTRIB_INSTANCED_MATRIX_COL_1 = 4,
    ATTRIB_INSTANCED_MATRIX_COL_2 = 5,
    ATTRIB_INSTANCED_MATRIX_COL_3 = 6,
    ATTRIB_INSTANCED_MATRIX_COL_4 = 7,
};

export class Buffer {

    private _gl: WebGL2RenderingContext;
    private _layout: BufferLayout_t;
    private _byteLength: number = -1;
    private _length: number = -1;
    private _glBuffer: WebGLBuffer;
    private _target: GLenum;
    private _data: BufferData_t;
    private _usage: GLenum;

    constructor(target?: number) {
        this._target = target ?? glC.ARRAY_BUFFER;
        this._layout = {
            attributes: [],
            stride: 0,
            stepMode: StepMode_e.vertex,
        };
    }

    get length(): number { return this._length; }
    get byteLength(): number { return this._byteLength; }

    setData(data: BufferData_t, usage?: GLenum): Buffer {
        this._length = data.length;
        this._byteLength = data.byteLength;
        this._data = data;
        this._usage = usage ?? glC.STATIC_DRAW;
        return this;
    }

    updateData(data: BufferData_t): Buffer {
        const gl = this._gl;
        if (!gl) log.warn("[Buffer] you should call 'createGPUResource' before this.");
        //  device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);
        gl.bindBuffer(this._target, this._glBuffer);
        gl.bufferData(this._target, data, this._usage);
        gl.bindBuffer(this._target, null);
        return this;
    }

    createGPUResource(gl: WebGL2RenderingContext): Buffer {
        this._gl = gl;
        this._glBuffer ??= gl.createBuffer();
        this.updateData(this._data);
        this._data = undefined;

        /**
          device.createBuffer({
            size: BUFFER_SIZE,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
        */
        return this;
    }

    setAttribute(shaderLocation: ShaderLocation_e, size: number, type: number, normalized: boolean, offset: GLintptr): Buffer {
        this._layout.attributes.push({ shaderLocation, size, type, normalized, offset });
        return this;
    }

    setStrideAndStepMode(stride: number, stepMode?: StepMode_e): Buffer {
        this._layout.stride = stride;
        this._layout.stepMode = stepMode ?? StepMode_e.vertex;
        return this;
    }

    bind(): void {
        const gl = this._gl;

        gl.bindBuffer(this._target, this._glBuffer);
        this._layout.attributes.forEach(a => {
            gl.enableVertexAttribArray(a.shaderLocation);
            gl.vertexAttribPointer(a.shaderLocation, a.size, a.type, a.normalized, this._layout.stride, a.offset);
            if (this._layout.stepMode === StepMode_e.instance) {
                gl.vertexAttribDivisor(a.shaderLocation, 1); // Advance per instance
            }
        });

    }

    destroyGPUResource(): void {
        if (!!this._glBuffer) this._gl.deleteBuffer(this._glBuffer);
        this._glBuffer = undefined;
    }
}

export type UniformUpdater = {
    [key: string]: (u: WebGLUniformLocation) => void;
}

const _wm_program = new WeakMap();
export class Program implements IBindableObject {
    private _glProgram: WebGLProgram;
    private _gl: WebGL2RenderingContext;
    private _mapUniform = new Map();

    static compile(gl: WebGL2RenderingContext, vsSource: string, type: GLenum): WebGLShader | undefined {
        const _shader = gl.createShader(type);
        gl.shaderSource(_shader, vsSource);
        gl.compileShader(_shader);

        if (!gl.getShaderParameter(_shader, gl.COMPILE_STATUS)) {
            log.vital("[Program::compile] shader compilation failed:", gl.getShaderInfoLog(_shader));
            gl.deleteShader(_shader);
            return undefined;
        }
        return _shader;
    }

    constructor(gl: WebGL2RenderingContext, vsSource?: string, fsSource?: string) {
        this._gl = gl;
        if (vsSource && fsSource) {
            const _vertShader = Program.compile(gl, vsSource, gl.VERTEX_SHADER);
            const _fragShader = Program.compile(gl, fsSource, gl.FRAGMENT_SHADER);
            this.link(_vertShader, _fragShader);
            gl.deleteShader(_vertShader);
            gl.deleteShader(_fragShader);
        }
    }

    get criticalKey(): object { return Program; }
    link(vertexShader: WebGLShader, fragmentShader: WebGLShader): Program {
        const gl = this._gl;
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            log.vital("Shader program linking failed:", gl.getProgramInfoLog(shaderProgram));
            gl.deleteProgram(shaderProgram);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return;
        }

        const uniformCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const uniformInfo = gl.getActiveUniform(shaderProgram, i);
            if (uniformInfo) {
                const _u = gl.getUniformLocation(shaderProgram, uniformInfo.name);
                this._mapUniform.set(uniformInfo.name, _u);
            } else {
                log.vital("[gl.js] can't get uniform info.");
            }
        }

        this._glProgram = shaderProgram;
        _wm_program.set(this, shaderProgram);
        return this;
    }
    getAttribLocation(name: string) {
        return this._gl.getAttribLocation(this._glProgram, name);
    }
    updateUniforms(uniformUpdater: UniformUpdater): Program {
        this._mapUniform.forEach((v, k) => {
            uniformUpdater[`update${k}`](v);
        });
        return this;
    };
    bind(): void {
        this._gl.useProgram(this._glProgram);
    };

    destroy() {
        this._gl.deleteProgram(this._glProgram);
        this._glProgram = undefined;
        this._gl = undefined;
    }
}

const _wm_texture = new WeakMap();

export class Texture {

    private _glTexture: WebGLTexture;
    private _gl: WebGL2RenderingContext;
    private _texUnit: GLint = -1;
    private _internalFormat: GLint;
    private _format: GLenum;
    private _type: GLenum;

    /**
    * internalFormat defaults to gl.RGBA
    * format defaults to gl.RGBA
    * type defaults to gl.UNSIGNED_BYTE
    */
    constructor(gl: WebGL2RenderingContext, internalFormat?: GLint, format?: GLenum, type?: GLenum) {
        this._gl = gl;
        this._internalFormat = internalFormat ?? gl.RGBA;
        this._format = format ?? gl.RGBA;
        this._type = type ?? gl.UNSIGNED_BYTE;
    }

    get textureUnit(): GLint { return this._texUnit; }

    createGLTexture(data: any): Texture {
        if (!!this._glTexture) return this;
        const gl = this._gl;
        this._createTexture(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, this._internalFormat, this._format, this._type, data);
        return this;
    }

    updateData(data: any, xoffset: number, yoffset: number, width: number, height: number): Texture {
        if (!this._glTexture) return this;
        const gl = this._gl;
        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, xoffset, yoffset, width, height, this._format, this._type, data);
        return this;
    }

    createGLTextureWithSize(width: number, height: number): Texture {
        if (!!this._glTexture) return this;
        const gl = this._gl;
        this._createTexture(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, this._internalFormat, width, height, 0, this._format, this._type, null);
        return this;
    }

    private _createTexture(gl: WebGL2RenderingContext): void {
        const _texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, _texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        this._glTexture = _texture;
        _wm_texture.set(this, _texture);
    }

    setParameter(name: number, value: number): Texture {
        if (!this._glTexture) return this;
        this._gl.texParameteri(this._gl.TEXTURE_2D, name, value);
        return this;
    }

    bind(textureUnit: number): Texture {
        const gl = this._gl;
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
        this._texUnit = textureUnit;
        return this;
    }

    destroyGLTexture(): Texture {
        const gl = this._gl;
        gl.deleteTexture(this._glTexture);
        this._glTexture = undefined;
        return this;
    }
}

export class SkyboxTexture {
    private _glTexture: WebGLTexture;
    private _gl: WebGL2RenderingContext;
    private _texUnit: GLint = -1;
    private _genMipmap: boolean;
    constructor(gl: WebGL2RenderingContext, genMipmap = true) {
        this._gl = gl;
        this._genMipmap = genMipmap;
    }

    get textureUnit(): GLint { return this._texUnit; }

    /**
     * data[0-5]: x+,x-,y+, y-, z+,z-
     */
    createGLTexture(data: any[]): SkyboxTexture {
        if (!!this._glTexture) return this;
        const gl = this._gl;
        this._createTexture(gl);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data[0]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data[1]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data[2]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data[3]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data[4]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data[5]);
        return this;
    }

    createGLTextureWithSize(width: number, height: number): SkyboxTexture {
        if (!!this._glTexture) return this;
        const gl = this._gl;
        this._createTexture(gl);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        return this;
    }

    /**
     * data[0-5]: x+,x-,y+, y-, z+,z-
     */
    updateData(data: any[], xoffset: number, yoffset: number, width: number, height: number): SkyboxTexture {
        if (!this._glTexture) return this;
        const gl = this._gl;
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._glTexture);
        gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, xoffset, yoffset, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data[0]);
        gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, xoffset, yoffset, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data[1]);
        gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, xoffset, yoffset, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data[2]);
        gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, xoffset, yoffset, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data[3]);
        gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, xoffset, yoffset, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data[4]);
        gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, xoffset, yoffset, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data[5]);
        return this;
    }

    private _createTexture(gl: WebGL2RenderingContext): void {
        const _texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, _texture);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        this._genMipmap && gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        this._glTexture = _texture;
        _wm_texture.set(this, _texture);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    }

    setParameter(name: number, value: number): SkyboxTexture {
        if (!this._glTexture) return this;
        this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, name, value);
        return this;
    }

    bind(textureUnit: number): SkyboxTexture {
        const gl = this._gl;
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._glTexture);
        this._texUnit = textureUnit;
        return this;
    }

    destroyGLTexture(): SkyboxTexture {
        const gl = this._gl;
        gl.deleteTexture(this._glTexture);
        this._glTexture = undefined;
        return this;
    }
}

const _wm_framebuffer = new WeakMap();

export class Framebuffer implements IBindableObject {

    protected _glFramebuffer: WebGLFramebuffer;
    protected _gl: WebGL2RenderingContext;
    protected _width: number;
    protected _height: number;

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this._gl = gl;
        this._width = width;
        this._height = height;
        if (width * height != 0) {
            this._glFramebuffer = gl.createFramebuffer();
        }
        _wm_framebuffer.set(this, this._glFramebuffer);
    }

    get criticalKey(): object { return Framebuffer; }

    attachColorTexture(texture: Texture, attachment: number, target?: GLenum): void {
        if (!this._glFramebuffer) return;
        const gl = this._gl;
        target ??= gl.TEXTURE_2D;
        const _glTex = _wm_texture.get(texture);
        gl.bindTexture(target, _glTex);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + (attachment ?? 0), target, _glTex, 0);
        gl.bindTexture(target, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    attachDepthTexture(texture: Texture, target?: number): void {
        if (!this._glFramebuffer) return;
        const gl = this._gl;
        target ??= gl.TEXTURE_2D;
        const _glTex = _wm_texture.get(texture);
        gl.bindTexture(target, _glTex);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, target, _glTex, 0);
        gl.bindTexture(target, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    validate(): void {
        const gl = this._gl;
        if (this._glFramebuffer) {
            gl.bindFramebuffer(glC.FRAMEBUFFER, this._glFramebuffer);
            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

            if (status != gl.FRAMEBUFFER_COMPLETE) {
                switch (status) {
                    case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                        log.vital("[Framebuffer] attachment is incomplete.");
                        break;
                    case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                        log.vital("[Framebuffer] missing attachment.");
                        break;
                    case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                        log.vital("[Framebuffer] attachments have different dimensions.");
                        break;
                    case gl.FRAMEBUFFER_UNSUPPORTED:
                        log.vital("[Framebuffer] unsupported combination of attachments.");
                        break;
                    default:
                        log.vital("[Framebuffer] Unknown error.");
                        break;
                }
            }
            gl.bindFramebuffer(glC.FRAMEBUFFER, null);
        }
    }

    clear(): void {
        const gl = this._gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    bind(): void {
        const gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
        if (this._glFramebuffer) {
            gl.viewport(0, 0, this._width, this._height);
        }
        this.clear();
    }

    destroy() {
        this._glFramebuffer && this._gl.deleteFramebuffer(this._glFramebuffer);
        this._glFramebuffer = undefined;
    }
}

export type SubPipelineOption = {
    onlyOnce?: boolean;
};

export class Pipeline {
    FBO: Framebuffer;
    program: Program;

    private _gl: WebGL2RenderingContext;
    private _arrSubPipeline: SubPipeline[] = [];
    private _arrOneTimeSubPipeline: SubPipeline[] = [];
    private _enableCullFace = false;
    private _culledFace: GLenum;

    private _enableDepthTest = false;
    private _depthTestFunc: GLenum;

    private _enableBlend = false;
    private _blendFuncSF: GLenum;
    private _blendFuncDF: GLenum;
    private _blendEquation: GLenum;

    private _drawBuffers: GLenum[];
    private _priority: number;
    constructor(gl: WebGL2RenderingContext, priority: number = 0) {
        this._gl = gl;
        this._culledFace = gl.BACK;
        this._depthTestFunc = gl.LESS;
        this._priority = priority;
    }

    get priority(): number { return this._priority; }
    setFBO(fbo: Framebuffer): Pipeline { this.FBO = fbo; return this; }
    setProgram(program: Program): Pipeline { this.program = program; return this; }
    appendSubPipeline(subp: SubPipeline, option?: SubPipelineOption): Pipeline {
        let _onlyOnce = (option?.onlyOnce) ? true : false;
        _onlyOnce ? this._arrOneTimeSubPipeline.push(subp) : this._arrSubPipeline.push(subp);
        return this;
    }
    removeSubPipeline(subp: SubPipeline): Pipeline {
        for (let i = 0; i < this._arrSubPipeline.length; ++i) {
            if (this._arrSubPipeline[i] === subp) {
                this._arrSubPipeline.splice(i, 1);
                break;
            }
        }
        return this;
    }
    removeSubPipelines(): Pipeline {
        this._arrSubPipeline.length = 0;
        return this;
    }
    depthTest(enable: boolean, func?: GLenum): Pipeline {
        this._enableDepthTest = enable;
        this._depthTestFunc = func;
        return this;
    }
    blend(enable: boolean, funcSF?: GLenum, funcDF?: GLenum, equation?: GLenum): Pipeline {
        this._enableBlend = enable;
        this._blendFuncSF = funcSF;
        this._blendFuncDF = funcDF;
        this._blendEquation = equation;
        return this;
    }
    cullFace(enable: boolean, culledFace?: GLenum): Pipeline {
        this._enableCullFace = enable;
        this._culledFace = culledFace;
        return this;
    }
    drawBuffers(...buffers: GLenum[]): Pipeline {
        this._drawBuffers = buffers;
        return this;
    }
    validate(): Pipeline {
        if (this.FBO && !(this.FBO instanceof Framebuffer))
            log.vital('[Pipeline] FBO is not a valid Framebuffer instance.');
        if (!(this.program && this.program instanceof Program))
            log.vital('[Pipeline] program is not exist OR is not a valid Program instance.');
        //todo:
        return this;
    }

    execute(renderState: RenderState): Pipeline {
        renderState.bind(this.FBO);
        if (this._arrSubPipeline.length <= 0) return this;
        renderState.bind(this.program);

        renderState.setCullFace(this._enableCullFace, this._culledFace);
        renderState.setDepthTest(this._enableDepthTest, this._depthTestFunc);
        renderState.setBlend(this._enableBlend, this._blendFuncSF, this._blendFuncDF, this._blendEquation);

        const gl = this._gl;
        this._drawBuffers && gl.drawBuffers(this._drawBuffers);

        this._arrSubPipeline.forEach(subp => {
            subp.bind(renderState);
            this.program.updateUniforms(subp.uniformUpdater);
            subp.draw();
        });

        if (this._arrOneTimeSubPipeline.length <= 0) return this;
        this._arrOneTimeSubPipeline.forEach(subp => {
            subp.bind(renderState);
            this.program.updateUniforms(subp.uniformUpdater);
            subp.draw();
        });
        this._arrOneTimeSubPipeline.length = 0;
        return this;
    }
}

export class SubPipeline {

    geometry: IGeometry;
    textureSet: Set<Texture | SkyboxTexture> = new Set();
    uniformUpdater: UniformUpdater;

    constructor() { }

    setUniformUpdater(updater: UniformUpdater): SubPipeline {
        this.uniformUpdater = updater;
        return this;
    }

    setGeometry(geo: IGeometry): SubPipeline {
        this.geometry = geo;
        return this;
    }
    setTextures(...tex: Array<Texture | SkyboxTexture>): SubPipeline {
        tex.forEach(t => {
            this.textureSet.add(t);
        });
        return this;
    }
    setTexture(texture: Texture | SkyboxTexture): SubPipeline {
        this.textureSet.add(texture);
        return this;
    }
    clearTextures(): SubPipeline {
        this.textureSet.clear();
        return this;
    }

    validate(): SubPipeline {
        //TODO: fix this, recusive referrencing.;
        if (!(this.geometry instanceof Object))
            log.vital('[SubPipeline] geometry is not a instance of Geometry.');
        this.textureSet.forEach((tex) => {
            if (!(tex instanceof Texture))
                log.vital('[SubPipeline] textureSet has null-Texture object.');
        });
        if (!this.uniformUpdater) log.vital('[SubPipeline] uniform updater is not exist.');
        return this;
    }

    bind(renderState: RenderState): void {
        renderState.bind(this.geometry);
        //TODO: further improvments.
        let i = 0;
        this.textureSet.forEach(t => {
            t.bind(i);
            ++i;
        });
    }

    draw(): void {
        this.geometry.drawCMD();
    }

    clone(): SubPipeline {
        const sub = new SubPipeline();
        sub.geometry = this.geometry;
        this.textureSet.forEach(t => {
            sub.textureSet.add(t);
        });
        sub.uniformUpdater = this.uniformUpdater;
        return sub;
    }
}

export type PipelineOption = SubPipelineOption;

export interface IBindableObject {
    readonly criticalKey: object;
    bind(): void;
};

class RenderState {
    private _state: Map<GLenum, boolean | GLenum> = new Map();
    private _wm_glObject = new WeakMap();
    private _gl: WebGL2RenderingContext;
    constructor(gl: WebGL2RenderingContext) {
        this._gl = gl;
        const _s = this._state;
        _s.set(gl.BLEND, gl.getParameter(gl.BLEND));
        _s.set(gl.BLEND_EQUATION, gl.getParameter(gl.BLEND_EQUATION));
        _s.set(gl.BLEND_SRC_RGB, gl.getParameter(gl.BLEND_SRC_RGB));
        _s.set(gl.BLEND_DST_RGB, gl.getParameter(gl.BLEND_DST_RGB));

        _s.set(gl.DEPTH_TEST, gl.getParameter(gl.DEPTH_TEST));
        _s.set(gl.DEPTH_FUNC, gl.getParameter(gl.DEPTH_FUNC));

        _s.set(gl.CULL_FACE, gl.getParameter(gl.CULL_FACE));
        _s.set(gl.CULL_FACE_MODE, gl.getParameter(gl.CULL_FACE_MODE));
    }

    bind(obj: IBindableObject) {
        if (this._wm_glObject.get(obj.criticalKey) === obj) return this;
        else {
            this._wm_glObject.set(obj.criticalKey, obj);
            obj.bind();
            return this;
        }
    }

    setDepthTest(enable: boolean, func: GLenum) {
        const gl = this._gl;
        const _state = this._state;
        if (_state.get(gl.DEPTH_TEST) != enable) {
            enable ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
            _state.set(gl.DEPTH_TEST, enable);
        }
        if (enable) {
            if (_state.get(gl.DEPTH_FUNC) != func) {
                gl.depthFunc(func);
                _state.set(gl.DEPTH_FUNC, func);
            }
        }
    }
    setBlend(enable: boolean, funcSF: GLenum, funcDF: GLenum, equation: GLenum) {
        const gl = this._gl;
        const _state = this._state;
        if (_state.get(gl.BLEND) != enable) {
            enable ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND);
            _state.set(gl.BLEND, enable);
        }
        if (enable) {
            if (_state.get(gl.BLEND_EQUATION) != equation) {
                gl.blendEquation(equation);
                _state.set(gl.BLEND_EQUATION, equation);
            }
            if (_state.get(gl.BLEND_SRC_RGB) != funcSF || _state.get(gl.BLEND_DST_RGB) != funcDF) {
                gl.blendFunc(funcSF, funcDF);
                _state.set(gl.BLEND_SRC_RGB, funcSF);
                _state.set(gl.BLEND_DST_RGB, funcDF);
            }
        }
    }
    setCullFace(enable: boolean, faceToCull: GLenum) {
        const gl = this._gl;
        const _state = this._state;
        if (_state.get(gl.CULL_FACE) != enable) {
            enable ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
            _state.set(gl.CULL_FACE, enable);
        }
        if (enable) {
            if (_state.get(gl.CULL_FACE_MODE) != faceToCull) {
                gl.cullFace(faceToCull);
                _state.set(gl.CULL_FACE_MODE, faceToCull);
            }
        }
    }
}

export class Renderer {
    private _defaultFBO: Framebuffer;
    private _maxTextureUnits: number;
    private _renderState: RenderState;
    private _arrPipeline: Pipeline[];
    private _arrPipeline_1: Pipeline[] = [];
    private _arrPipeline_2: Pipeline[] = [];
    private _arrOneTimePipeline: Pipeline[] = [];
    private _arrTransparentPipeline: Pipeline[] = [];
    private _gl: WebGL2RenderingContext;

    constructor(gl: WebGL2RenderingContext) {
        this._gl = gl;
        this._defaultFBO = new Framebuffer(gl, 0, 0);
        this._maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        this._arrPipeline = this._arrPipeline_1;
        this._renderState = new RenderState(gl);
    }

    render(): Renderer {
        const gl = this._gl;
        this._arrPipeline.forEach((p) => {
            p.execute(this._renderState);
        });
        this._arrOneTimePipeline.forEach((p) => {
            p.execute(this._renderState);
        });
        this._arrOneTimePipeline.length = 0;
        //gl.disable(gl.DEPTH_TEST);
        this._arrTransparentPipeline.forEach((p) => {
            p.execute(this._renderState);
        });
        return this;
    }

    addPipeline(p: Pipeline, option?: PipelineOption): Renderer {
        let _onlyOnce = (option?.onlyOnce) ? true : false;
        p.FBO ??= this._defaultFBO;
        _onlyOnce ? this._arrOneTimePipeline.push(p) : this._arrPipeline.push(p);
        this._sortPipline();
        return this;
    }
    addTransparentPipeline(p: Pipeline): Renderer {
        this._arrTransparentPipeline.push(p);
        return this;
    }

    removePipeline(p: Pipeline) {
        for (let i = 0; i < this._arrPipeline.length; ++i) {
            if (this._arrPipeline[i] === p) {
                this._arrPipeline.splice(i, 1);
                break;
            }
        }
    }
    private _sortPipline() {
        const _arrCurrentP = this._arrPipeline;
        //const _arrFutureP = _arrCurrentP === this._arrPipeline_1 ? this._arrPipeline_2 : this._arrPipeline_1;
        _arrCurrentP.sort((a, b) => b.priority - a.priority);
    }
}

