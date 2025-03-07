import log from "./log.js"
import { default as glC, initGLConstant } from "./gl-const.js"
import {
    createContext_fn_t,
    IGeometry,
    IBuffer, BufferData_t, BufferLayout_t, StepMode_e, ShaderLocation_e,
    IProgram,
    ITexture, ISkyboxTexture,
    IFramebuffer,
    IPipeline, ISubPipeline, UniformUpdater_t, PipelineOption_t, SubPipelineOption_t,
    IRenderer,
    IBindableObject,
} from "./types-interfaces.js";

let _renderState: RenderState;

export const createGLContext: createContext_fn_t = (canvasElementId: string): WebGL2RenderingContext => {
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
    _renderState = new RenderState(gl);
    //@ts-ignore
    window.gl = gl;// debug use;
    return gl;
}

export class GLBuffer implements IBuffer {

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

    setData(data: BufferData_t, usage?: GLenum): IBuffer {
        this._length = data.length;
        this._byteLength = data.byteLength;
        this._data = data;
        this._usage = usage ?? glC.STATIC_DRAW;
        return this;
    }

    updateData(data: BufferData_t): IBuffer {
        const gl = this._gl;
        if (!gl) log.warn("[Buffer] you should call 'createGPUResource' before this.");
        //  device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);
        gl.bindBuffer(this._target, this._glBuffer);
        gl.bufferData(this._target, data, this._usage);
        gl.bindBuffer(this._target, null);
        return this;
    }

    createGPUResource(gl: WebGL2RenderingContext): IBuffer {
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

    setAttribute(shaderLocation: ShaderLocation_e, size: number, type: number, normalized: boolean, offset: GLintptr): IBuffer {
        this._layout.attributes.push({ shaderLocation, size, type, normalized, offset });
        return this;
    }

    setStrideAndStepMode(stride: number, stepMode?: StepMode_e): IBuffer {
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

const _wm_program = new WeakMap();

export class GLProgram implements IProgram {
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
            const _vertShader = GLProgram.compile(gl, vsSource, gl.VERTEX_SHADER);
            const _fragShader = GLProgram.compile(gl, fsSource, gl.FRAGMENT_SHADER);
            this.link(_vertShader, _fragShader);
            gl.deleteShader(_vertShader);
            gl.deleteShader(_fragShader);
        }
    }

    get criticalKey(): object { return GLProgram; }

    link(vertexShader: WebGLShader, fragmentShader: WebGLShader): IProgram {
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
    updateUniforms(uniformUpdater: UniformUpdater_t): IProgram {
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

export class GLTexture implements ITexture {

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

    createGLTexture(data: any): ITexture {
        if (!!this._glTexture) return this;
        const gl = this._gl;
        this._createTexture(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, this._internalFormat, this._format, this._type, data);
        return this;
    }

    updateData(data: any, xoffset: number, yoffset: number, width: number, height: number): ITexture {
        if (!this._glTexture) return this;
        const gl = this._gl;
        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, xoffset, yoffset, width, height, this._format, this._type, data);
        return this;
    }

    createGLTextureWithSize(width: number, height: number): ITexture {
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

    setParameter(name: number, value: number): ITexture {
        if (!this._glTexture) return this;
        this._gl.texParameteri(this._gl.TEXTURE_2D, name, value);
        return this;
    }

    bind(textureUnit: number): ITexture {
        const gl = this._gl;
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
        this._texUnit = textureUnit;
        return this;
    }

    destroyGLTexture(): ITexture {
        const gl = this._gl;
        gl.deleteTexture(this._glTexture);
        this._glTexture = undefined;
        return this;
    }
}

export class GLSkyboxTexture implements ISkyboxTexture {
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
    createGLTexture(data: any[]): ISkyboxTexture {
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

    createGLTextureWithSize(width: number, height: number): ISkyboxTexture {
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
    updateData(data: any[], xoffset: number, yoffset: number, width: number, height: number): ISkyboxTexture {
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

    setParameter(name: number, value: number): ISkyboxTexture {
        if (!this._glTexture) return this;
        this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, name, value);
        return this;
    }

    bind(textureUnit: number): ISkyboxTexture {
        const gl = this._gl;
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._glTexture);
        this._texUnit = textureUnit;
        return this;
    }

    destroyGLTexture(): ISkyboxTexture {
        const gl = this._gl;
        gl.deleteTexture(this._glTexture);
        this._glTexture = undefined;
        return this;
    }
}

const _wm_framebuffer = new WeakMap();

export class GLFramebuffer implements IFramebuffer {

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

    get criticalKey(): object { return GLFramebuffer; }

    attachColorTexture(texture: ITexture, attachment: number, target?: GLenum): void {
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

    attachDepthTexture(texture: ITexture, target?: number): void {
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

export class GLPipeline implements IPipeline {
    FBO: IFramebuffer;
    program: IProgram;

    private _gl: WebGL2RenderingContext;
    private _arrSubPipeline: ISubPipeline[] = [];
    private _arrOneTimeSubPipeline: ISubPipeline[] = [];
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

    setFBO(fbo: IFramebuffer): IPipeline {
        this.FBO = fbo;
        return this;
    }
    setProgram(program: IProgram): IPipeline {
        this.program = program;
        return this;
    }
    appendSubPipeline(subp: ISubPipeline, option?: SubPipelineOption_t): IPipeline {
        let _onlyOnce = (option?.onlyOnce) ? true : false;
        _onlyOnce ? this._arrOneTimeSubPipeline.push(subp) : this._arrSubPipeline.push(subp);
        return this;
    }
    removeSubPipeline(subp: ISubPipeline): IPipeline {
        for (let i = 0; i < this._arrSubPipeline.length; ++i) {
            if (this._arrSubPipeline[i] === subp) {
                this._arrSubPipeline.splice(i, 1);
                break;
            }
        }
        return this;
    }
    removeSubPipelines(): IPipeline {
        this._arrSubPipeline.length = 0;
        return this;
    }
    depthTest(enable: boolean, func?: GLenum): IPipeline {
        this._enableDepthTest = enable;
        this._depthTestFunc = func;
        return this;
    }
    blend(enable: boolean, funcSF?: GLenum, funcDF?: GLenum, equation?: GLenum): IPipeline {
        this._enableBlend = enable;
        this._blendFuncSF = funcSF;
        this._blendFuncDF = funcDF;
        this._blendEquation = equation;
        return this;
    }
    cullFace(enable: boolean, culledFace?: GLenum): IPipeline {
        this._enableCullFace = enable;
        this._culledFace = culledFace;
        return this;
    }
    drawBuffers(...buffers: GLenum[]): IPipeline {
        this._drawBuffers = buffers;
        return this;
    }
    validate(): IPipeline {
        if (this.FBO && !(this.FBO instanceof GLFramebuffer))
            log.vital('[Pipeline] FBO is not a valid Framebuffer instance.');
        if (!(this.program && this.program instanceof GLProgram))
            log.vital('[Pipeline] program is not exist OR is not a valid Program instance.');
        //todo:
        return this;
    }

    execute(): IPipeline {
        _renderState.bind(this.FBO);
        if (this._arrSubPipeline.length <= 0) return this;
        _renderState.bind(this.program);

        _renderState.setCullFace(this._enableCullFace, this._culledFace);
        _renderState.setDepthTest(this._enableDepthTest, this._depthTestFunc);
        _renderState.setBlend(this._enableBlend, this._blendFuncSF, this._blendFuncDF, this._blendEquation);

        const gl = this._gl;
        this._drawBuffers && gl.drawBuffers(this._drawBuffers);

        this._arrSubPipeline.forEach(subp => {
            subp.bind();
            this.program.updateUniforms(subp.uniformUpdater);
            subp.draw();
        });

        if (this._arrOneTimeSubPipeline.length <= 0) return this;
        this._arrOneTimeSubPipeline.forEach(subp => {
            subp.bind();
            this.program.updateUniforms(subp.uniformUpdater);
            subp.draw();
        });
        this._arrOneTimeSubPipeline.length = 0;
        return this;
    }
}

export class GLSubPipeline implements ISubPipeline {

    geometry: IGeometry;
    textureSet: Set<ITexture | ISkyboxTexture> = new Set();
    uniformUpdater: UniformUpdater_t;

    constructor() { }

    setUniformUpdater(updater: UniformUpdater_t): ISubPipeline {
        this.uniformUpdater = updater;
        return this;
    }

    setGeometry(geo: IGeometry): ISubPipeline {
        this.geometry = geo;
        return this;
    }
    setTextures(...tex: Array<ITexture | ISkyboxTexture>): ISubPipeline {
        tex.forEach(t => {
            this.textureSet.add(t);
        });
        return this;
    }
    setTexture(texture: ITexture | ISkyboxTexture): ISubPipeline {
        this.textureSet.add(texture);
        return this;
    }
    clearTextures(): ISubPipeline {
        this.textureSet.clear();
        return this;
    }

    validate(): ISubPipeline {
        //TODO: fix this, recusive referrencing.;
        if (!(this.geometry instanceof Object))
            log.vital('[SubPipeline] geometry is not a instance of Geometry.');
        this.textureSet.forEach((tex) => {
            if (!(tex instanceof GLTexture))
                log.vital('[SubPipeline] textureSet has null-Texture object.');
        });
        if (!this.uniformUpdater) log.vital('[SubPipeline] uniform updater is not exist.');
        return this;
    }

    bind(): void {
        _renderState.bind(this.geometry);
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

    clone(): ISubPipeline {
        const sub = new GLSubPipeline();
        sub.geometry = this.geometry;
        this.textureSet.forEach(t => {
            sub.textureSet.add(t);
        });
        sub.uniformUpdater = this.uniformUpdater;
        return sub;
    }
}

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

export class GLRenderer implements IRenderer {
    private _defaultFBO: IFramebuffer;
    private _maxTextureUnits: number;
    private _arrPipeline: IPipeline[];
    private _arrPipeline_1: IPipeline[] = [];
    private _arrPipeline_2: IPipeline[] = [];
    private _arrOneTimePipeline: IPipeline[] = [];
    private _arrTransparentPipeline: IPipeline[] = [];
    private _gl: WebGL2RenderingContext;

    constructor(gl: WebGL2RenderingContext) {
        this._gl = gl;
        this._defaultFBO = new GLFramebuffer(gl, 0, 0);
        this._maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        this._arrPipeline = this._arrPipeline_1;
    }

    render(): IRenderer {
        const gl = this._gl;
        this._arrPipeline.forEach((p) => {
            p.execute();
        });
        this._arrOneTimePipeline.forEach((p) => {
            p.execute();
        });
        this._arrOneTimePipeline.length = 0;
        //gl.disable(gl.DEPTH_TEST);
        this._arrTransparentPipeline.forEach((p) => {
            p.execute();
        });
        return this;
    }

    addPipeline(p: IPipeline, option?: PipelineOption_t): IRenderer {
        let _onlyOnce = (option?.onlyOnce) ? true : false;
        p.FBO ??= this._defaultFBO;
        _onlyOnce ? this._arrOneTimePipeline.push(p) : this._arrPipeline.push(p);
        this._sortPipline();
        return this;
    }
    addTransparentPipeline(p: IPipeline): IRenderer {
        this._arrTransparentPipeline.push(p);
        return this;
    }

    removePipeline(p: IPipeline): IRenderer {
        for (let i = 0; i < this._arrPipeline.length; ++i) {
            if (this._arrPipeline[i] === p) {
                this._arrPipeline.splice(i, 1);
                break;
            }
        }
        return this;
    }
    private _sortPipline() {
        const _arrCurrentP = this._arrPipeline;
        //const _arrFutureP = _arrCurrentP === this._arrPipeline_1 ? this._arrPipeline_2 : this._arrPipeline_1;
        _arrCurrentP.sort((a, b) => b.priority - a.priority);
    }
}

export class GLFramebuffer_C0_r32i extends GLFramebuffer {

    private _ref_texture_r32i: ITexture;
    private _depthTexture: ITexture;
    private _clearColor: Int32Array = new Int32Array(4).fill(0);
    private _pixel = new Int32Array(1);

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        super(gl, width, height);
        this._ref_texture_r32i = new GLTexture(gl, gl.R32I, gl.RED_INTEGER, gl.INT).createGLTextureWithSize(width, height);
        this.attachColorTexture(this._ref_texture_r32i, 0);
        //
        // todo: change to render buffer depth .
        this._depthTexture = new GLTexture(gl, gl.DEPTH_COMPONENT16, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT).createGLTextureWithSize(width, height);
        this.attachDepthTexture(this._depthTexture);
    }
    get criticalKey(): object { return GLFramebuffer; }
    clear(): void {
        const gl = this._gl;
        gl.clearBufferiv(gl.COLOR, 0, this._clearColor);
        gl.clear(gl.DEPTH_BUFFER_BIT);
    }

    readPixel(x: number, y: number): number {
        const gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.readPixels(x, this._height - y, 1, 1, gl.RED_INTEGER, gl.INT, this._pixel);
        return this._pixel[0];
    }
}

