import log from "./log.js"
import { initProgram } from "./program-manager.js"
import { BINDING_POINT, default as glC, initGLConstant } from "./gl-const.js"
import {
    createContext_fn_t,
    ImageEncoding_e,
    IUniformBlock,
    IRenderContext,
    IBuffer, BufferData_t,
    IRenderObject,
    IProgram,
    ITexture, TextureData_t,
    IFramebuffer,
    IPipeline, ISubPipeline, UniformUpdaterFn_t, PipelineOption_t, SubPipelineOption_t,
    IMaterial,
    PBRTextureIndex_e,
    AfterExecuteCallbackFn_t,
} from "./types-interfaces.js";

const _wm_buffer = new WeakMap();

export class GLUniformBlock {

    private _glBuffer: WebGLBuffer;
    private _bindingPoint: number;
    private _sizeInBytes: number;
    private _gl: WebGL2RenderingContext;

    constructor(bindingPoint: number, sizeInBytes: number) {
        this._bindingPoint = bindingPoint;
        this._sizeInBytes = sizeInBytes;
    }

    get bindingPoint(): number {
        return this._bindingPoint;
    }

    createGPUResource(gl: WebGL2RenderingContext): GLUniformBlock {
        this._gl = gl;
        if (!this._glBuffer) {
            this._glBuffer ??= gl.createBuffer();
            gl.bindBuffer(gl.UNIFORM_BUFFER, this._glBuffer);
            gl.bufferData(gl.UNIFORM_BUFFER, this._sizeInBytes, gl.DYNAMIC_DRAW);
            _wm_buffer.set(this, this._glBuffer);
        }
        return this;
    }

    uploadData(data: BufferData_t): GLUniformBlock {
        const gl = this._gl;
        gl.bindBuffer(gl.UNIFORM_BUFFER, this._glBuffer);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);
        return this;
    }
}

export const createGLContext: createContext_fn_t = (canvas: HTMLCanvasElement): WebGL2RenderingContext => {
    const gl = canvas.getContext('webgl2', { stencil: true });
    if (!gl) {
        log.vital("[createGLContent] WebGL 2.0 not supported!");
    }
    initGLConstant(gl);
    initProgram(gl);
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (ext) {
        log.info("[createGLContent] Extension enabled: EXT_color_buffer_float\n", ext);
    } else {
        log.warn("[createGLContent] Extension not supported.");
    }

    function _genTex(r: number, g: number, b: number, a: number): ITexture {
        const _t = new GLTexture(1, 1);
        _t.data = new Uint8Array([r, g, b, a]);
        return _t;
    }
    _pbrTextures = [];
    _pbrTextures[PBRTextureIndex_e.NORMAL] = _genTex(127, 127, 255, 0);
    _pbrTextures[PBRTextureIndex_e.OCCLUSION] = _genTex(255, 255, 255, 255);
    _pbrTextures[PBRTextureIndex_e.EMISSIVE] = _genTex(0, 0, 0, 0);
    _pbrTextures[PBRTextureIndex_e.BASECOLOR] = _genTex(255, 255, 255, 255);
    _pbrTextures[PBRTextureIndex_e.METALLICROUGHNESS] = _genTex(255, 255, 255, 255);

    //@ts-ignore
    window.gl = gl;// debug use;
    return gl;
}

export class GLBuffer implements IBuffer {

    private _gl: WebGL2RenderingContext;
    private _byteLength: number = -1;
    private _length: number = -1;
    private _glBuffer: WebGLBuffer;
    private _target: GLenum;
    private _data: BufferData_t;
    private _usage: GLenum;

    constructor(target?: number) {
        this._target = target ?? glC.ARRAY_BUFFER;
    }

    get length(): number { return this._length; }
    get byteLength(): number { return this._byteLength; }

    updateData(data: BufferData_t, usage?: GLenum): IBuffer {
        const gl = this._gl;
        if (gl) {
            //  device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);
            gl.bindBuffer(this._target, this._glBuffer);
            gl.bufferSubData(this._target, 0, data);
            gl.bindBuffer(this._target, null);
        } else {
            this._length = data.length;
            this._byteLength = data.byteLength;
            this._data = data;
            this._usage = usage ?? glC.STATIC_DRAW;
        }
        return this;
    }

    createGPUResource(gl: WebGL2RenderingContext): IBuffer {
        this._gl = gl;
        if (this._glBuffer) return this;
        this._glBuffer = gl.createBuffer();
        _wm_buffer.set(this, this._glBuffer);
        gl.bindBuffer(this._target, this._glBuffer);
        gl.bufferData(this._target, this._data, this._usage);
        gl.bindBuffer(this._target, null);
        this._data = undefined;

        /**
          device.createBuffer({
            size: BUFFER_SIZE,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
        */
        return this;
    }


    bind(): void {
        const gl = this._gl;
        gl.bindBuffer(this._target, this._glBuffer);
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
    private _mapUniformFn: Map<string, (value: any) => void> = new Map();
    private _uboCameraIndex: number;
    private _uboLightIndex: number;
    private _uboMaterialIndex: number;

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

    setUBO(ubo: IUniformBlock): IProgram {
        const gl = this._gl;
        ubo.createGPUResource(gl);
        let _uboIndex = -1;
        if (ubo.bindingPoint === BINDING_POINT.UBO_BINDING_POINT_CAMERA) {
            _uboIndex = this._uboCameraIndex;
        } else if (ubo.bindingPoint === BINDING_POINT.UBO_BINDING_POINT_LIGHT) {
            _uboIndex = this._uboLightIndex;
        } else if (ubo.bindingPoint === BINDING_POINT.UBO_BINDING_POINT_MATERIAL) {
            _uboIndex = this._uboMaterialIndex;
        }
        if (_uboIndex !== gl.INVALID_INDEX) {
            gl.bindBuffer(gl.UNIFORM_BUFFER, _wm_buffer.get(ubo));
            gl.uniformBlockBinding(this._glProgram, _uboIndex, ubo.bindingPoint);
            gl.bindBufferBase(gl.UNIFORM_BUFFER, ubo.bindingPoint, _wm_buffer.get(ubo));
            gl.bindBuffer(gl.UNIFORM_BUFFER, null);
        }
        return this;
    }

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

        const _uniformIndicesInBlock: number[] = [];
        function _fn2(uboName: string) {
            //let _uniformOffsetsInBlock: number[] = [];
            const blockIndex = gl.getUniformBlockIndex(shaderProgram, uboName);
            if (blockIndex !== gl.INVALID_INDEX) {
                //const sizeInBytes = gl.getActiveUniformBlockParameter(shaderProgram, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE);
                //gl.uniformBlockBinding(shaderProgram, blockIndex, 0);
                const indices = gl.getActiveUniformBlockParameter(shaderProgram, blockIndex, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES);
                indices.forEach((value: number) => {
                    _uniformIndicesInBlock.push(value);
                });
                //const _uniformOffsetsInBlock = gl.getActiveUniforms(shaderProgram, _uniformIndicesInBlock, gl.UNIFORM_OFFSET);
                //const _uniformTypesInBlock = gl.getActiveUniforms(shaderProgram, _uniformIndicesInBlock, gl.UNIFORM_TYPE);
            } else {
                //log.warn("[GLUniformBlock] Uniform Block not found!");
            }
            return blockIndex;
        }
        this._uboCameraIndex = _fn2("u_ub_camera");
        this._uboLightIndex = _fn2("u_ub_light");
        this._uboMaterialIndex = _fn2("u_ub_material");

        let _fn: any;
        const uniformCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const uniformInfo = gl.getActiveUniform(shaderProgram, i);
            if (!_uniformIndicesInBlock.includes(i)) {
                const _u = gl.getUniformLocation(shaderProgram, uniformInfo.name);
                switch (uniformInfo.type) {
                    case gl.INT:
                        _fn = uniformInfo.size <= 1 ? gl.uniform1i.bind(gl, _u) : gl.uniform1iv.bind(gl, _u);
                        break;
                    case gl.FLOAT:
                        _fn = uniformInfo.size <= 1 ? gl.uniform1f.bind(gl, _u) : gl.uniform1fv.bind(gl, _u);
                        break;
                    case gl.FLOAT_VEC2:
                        _fn = gl.uniform2fv.bind(gl, _u);
                        break;
                    case gl.FLOAT_VEC3:
                        _fn = gl.uniform3fv.bind(gl, _u);
                        break;
                    case gl.FLOAT_VEC4:
                        _fn = gl.uniform4fv.bind(gl, _u);
                        break;
                    case gl.BOOL:
                        _fn = uniformInfo.size <= 1 ? gl.uniform1i.bind(gl, _u) : gl.uniform1iv.bind(gl, _u);
                        break;
                    case gl.FLOAT_MAT4:
                        _fn = gl.uniformMatrix4fv.bind(gl, _u, false);
                        break;
                    case gl.SAMPLER_3D:
                    case gl.SAMPLER_2D:
                    case gl.SAMPLER_2D_SHADOW:
                    case gl.SAMPLER_2D_ARRAY:
                    case gl.SAMPLER_2D_ARRAY_SHADOW:
                    case gl.SAMPLER_CUBE:
                        _fn = uniformInfo.size <= 1 ? gl.uniform1i.bind(gl, _u) : gl.uniform1iv.bind(gl, _u);
                        break;
                    default:
                        log.warn(`[Program] uniform:${uniformInfo.name} with type:${uniformInfo.type} is not implemented.`);
                }
                this._mapUniformFn.set(uniformInfo.name, _fn);
            }
        }

        this._glProgram = shaderProgram;
        _wm_program.set(this, shaderProgram);
        return this;
    }

    uploadUniform(name: string, value: any): IProgram {
        let _fn = this._mapUniformFn.get(name);
        _fn && _fn(value);
        return this;
    }

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

    private _hdr: boolean = false;
    private _glTexture: WebGLTexture;
    private _gl: WebGL2RenderingContext;
    private _texUnit: GLint = -1;
    private _internalFormat: GLint;
    private _format: GLenum;
    private _type: GLenum;
    private _width: number;
    private _height: number;
    private _depth: number = 0;
    private _data: TextureData_t | TextureData_t[];
    private _mapTextureParameter: Map<GLenum, GLenum> = new Map();
    private _UVIndex: number = 0;
    private _target: GLenum;
    private _genMipmap: boolean = true;
    private _encoding: ImageEncoding_e = ImageEncoding_e.LINEAR;

    /**
    * internalFormat defaults to gl.RGBA
    * format defaults to gl.RGBA
    * type defaults to gl.UNSIGNED_BYTE
    */
    constructor(width: number, height: number, internalFormat?: GLint, format?: GLenum, type?: GLenum, hdr: boolean = false) {
        this._width = width;
        this._height = height;
        this._internalFormat = internalFormat ?? glC.RGBA;
        this._format = format ?? glC.RGBA;
        this._type = type ?? glC.UNSIGNED_BYTE;
        this._target = glC.TEXTURE_2D;
        this._mapTextureParameter.set(glC.TEXTURE_WRAP_S, glC.CLAMP_TO_EDGE);
        this._mapTextureParameter.set(glC.TEXTURE_WRAP_T, glC.CLAMP_TO_EDGE);
        this._mapTextureParameter.set(glC.TEXTURE_MIN_FILTER, glC.NEAREST);
        this._mapTextureParameter.set(glC.TEXTURE_MAG_FILTER, glC.NEAREST);
        this._hdr = hdr;
    }

    set encoding(value: ImageEncoding_e) {
        this._encoding = value;
    }

    set depth(v: number) {
        this._depth = v;
    }

    get isHDRData(): boolean {
        return this._hdr;
    }

    get width(): number {
        return this._width;
    }

    get height(): number {
        return this._height;
    }

    set genMipmap(value: boolean) {
        this._genMipmap = value;
    }

    set target(value: GLenum) {
        this._target = value;
    }

    get target(): GLenum {
        return this._target;
    }

    set UVIndex(index: number) {
        this._UVIndex = index;
    }

    get UVIndex(): number {
        return this._UVIndex;
    }

    set data(data: any) {
        if (this._glTexture) {
            this.updateData(data);
        } else {
            this._data = data;
        }
    }

    get textureUnit(): GLint {
        return this._texUnit;
    }

    saveTexture(): void {
        const gl = this._gl;
        let framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._glTexture, 0);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error("Framebuffer is not complete");
            return;
        }

        let pixels = new Uint8Array(this._width * this._height * 4);
        gl.readPixels(0, 0, this._width, this._height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(framebuffer);

        let canvas = document.createElement("canvas");
        canvas.width = this._width;
        canvas.height = this._height;
        let ctx = canvas.getContext("2d");

        let imageData = ctx.createImageData(this._width, this._height);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);
        ctx.scale(1, -1);

        let link = document.createElement("a");
        link.download = "texture.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    }

    resize(width: number, height: number): ITexture {
        this._width = width;
        this._height = height;
        this.destroy();
        return this;
    }

    createGPUResource(gl: WebGL2RenderingContext): ITexture {
        if (!!this._glTexture) return this;
        this._gl = gl;
        const _texture = gl.createTexture();
        gl.bindTexture(this._target, _texture);
        this._mapTextureParameter.forEach((value, key) => {
            gl.texParameteri(this._target, key, value);
        });
        this._glTexture = _texture;
        _wm_texture.set(this, _texture);

        if (this._target === glC.TEXTURE_CUBE_MAP) {
            for (let i = 0; i < 6; ++i) {
                gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this._internalFormat, this._width, this._height, 0,
                    this._format, this._type, null);
            }
        } else if (this._target === glC.TEXTURE_2D) {
            //texImage2D(target, level, internalformat, width, height, border, format, type, source)
            gl.texImage2D(this._target, 0,
                this._encoding === ImageEncoding_e.LINEAR ? this._internalFormat : glC.SRGB8_ALPHA8, this._width, this._height, 0,
                this._format, this._type, null);
        } else if (this._target === glC.TEXTURE_3D) {
            gl.texImage3D(this._target, 0, this._internalFormat, this._width, this._height, this._depth, 0,
                this._format, this._type, null);
        }
        this.updateData(this._data);
        this._data = undefined;
        return this;
    }

    updateData(data: any, xoffset?: number, yoffset?: number, width?: number, height?: number, lod: number = 0): ITexture {
        if (!this._glTexture) return this;
        if (!data) return this;
        const gl = this._gl;
        gl.bindTexture(this._target, this._glTexture);
        if (this._target === glC.TEXTURE_CUBE_MAP) {
            for (let i = 0; i < 6; ++i) {
                gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
                    lod, xoffset ?? 0, yoffset ?? 0, width ?? this._width, height ?? this._height,
                    this._format, this._type, (data as Array<any>)[i] as any);
            }
        } else if (this._target === glC.TEXTURE_2D) {
            gl.texSubImage2D(this._target,
                lod, xoffset ?? 0, yoffset ?? 0, width ?? this._width, height ?? this._height,
                this._format, this._type, data as any);
        } else if (this._target === glC.TEXTURE_3D) {
            gl.texSubImage3D(this._target,
                lod, xoffset ?? 0, yoffset ?? 0, 0,
                width ?? this._width, height ?? this._height, this._depth,
                this._format, this._type, data as any);
        }
        this._genMipmap && gl.generateMipmap(this._target);
        return this;
    }

    setParameter(name: number, value: number): ITexture {
        if (this._glTexture) {
            this._gl.texParameteri(this._target, name, value);
        } else {
            this._mapTextureParameter.set(name, value);
        }
        return this;
    }

    bind(textureUnit: number): ITexture {
        const gl = this._gl;
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(this._target, this._glTexture);
        this._texUnit = textureUnit;
        return this;
    }

    destroy(): ITexture {
        const gl = this._gl;
        gl?.deleteTexture(this._glTexture);
        this._glTexture = undefined;
        return this;
    }
}

export class GLPipeline implements IPipeline {
    FBO: IFramebuffer;
    program: IProgram;

    private _name: string;
    private _device: WebGL2RenderingContext;
    private _arrSubPipeline: ISubPipeline[] = [];
    private _arrOneTimeSubPipeline: ISubPipeline[] = [];
    private _enableCullFace = false;
    private _culledFace: GLenum;
    private _textureSet: Array<ITexture> = [];

    private _enableDepthTest = false;
    private _depthTestFunc: GLenum;

    private _enableBlend = false;
    private _blendFuncSF: GLenum;
    private _blendFuncDF: GLenum;
    private _blendEquation: GLenum;

    private _drawBuffers: GLenum[];
    private _priority: number;

    private _afterExecuteCallback: AfterExecuteCallbackFn_t;

    constructor(priority: number = 0, name: string = "") {
        this._culledFace = glC.BACK;
        this._depthTestFunc = glC.LESS;
        this._priority = priority;
        this._name = name;
    }

    get name(): string {
        return this._name;
    }

    get afterExecuteCallbackFn(): AfterExecuteCallbackFn_t {
        return this._afterExecuteCallback;
    }

    setAfterExecuteCallbackFn(fn: AfterExecuteCallbackFn_t): IPipeline {
        this._afterExecuteCallback = fn;
        return this;
    }

    get priority(): number {
        return this._priority;
    }

    setFBO(fbo: IFramebuffer): IPipeline {
        this.FBO = fbo;
        return this;
    }

    setProgram(program: IProgram): IPipeline {
        this.program = program;
        return this;
    }

    createGPUResource(gl: WebGL2RenderingContext): IPipeline {
        this._device = gl;
        this.FBO.createGPUResource(gl);
        this._textureSet.forEach(t => {
            t.createGPUResource(gl);
        });
        this._arrSubPipeline.forEach((sp: ISubPipeline) => {
            sp.createGPUResource(gl);
        });
        return this;
    }

    addTexture(texture: ITexture): IPipeline {
        if (!texture) return this;
        texture.createGPUResource(this._device);
        this._textureSet.push(texture);
        this._arrSubPipeline.forEach((sp: ISubPipeline) => {
            sp.addTexture(texture);
        });
        return this;
    }

    appendSubPipeline(subp: ISubPipeline, option?: SubPipelineOption_t): IPipeline {
        let _renderOnce = (option?.renderOnce) ? true : false;
        _renderOnce ? this._arrOneTimeSubPipeline.push(subp) : this._arrSubPipeline.push(subp);
        this._textureSet.forEach(t => {
            subp.addTexture(t);
        });
        if (this._device) {
            subp.createGPUResource(this._device);
        }
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

    execute(context: IRenderContext): IPipeline {
        context.bind(this.FBO);
        if (this._arrSubPipeline.length <= 0) return this;
        context.bind(this.program);

        context.setCullFace(this._enableCullFace, this._culledFace);
        context.setDepthTest(this._enableDepthTest, this._depthTestFunc);
        context.setBlend(this._enableBlend, this._blendFuncSF, this._blendFuncDF, this._blendEquation);

        this._drawBuffers && context.gl.drawBuffers(this._drawBuffers);

        this._arrSubPipeline.forEach(subp => {
            subp.bind(context);
            subp.update(this.program);
            subp.draw();
        });

        if (this._arrOneTimeSubPipeline.length <= 0) return this;
        this._arrOneTimeSubPipeline.forEach(subp => {
            subp.bind(context);
            subp.update(this.program);
            subp.draw();
        });
        this._arrOneTimeSubPipeline.length = 0;
        return this;
    }
}

export class GLSubPipeline implements ISubPipeline {

    private _renderObject: IRenderObject;
    private _textureSet: Array<ITexture> = [];
    private _uniformUpdaterFn: UniformUpdaterFn_t;

    constructor() { }

    createGPUResource(gl: WebGL2RenderingContext): ISubPipeline {
        this._renderObject.createGPUResource(gl);
        this._textureSet.forEach(t => {
            t.createGPUResource(gl);
        });
        return this;
    }

    update(program: IProgram): ISubPipeline {
        this._uniformUpdaterFn && this._uniformUpdaterFn(program);
        return this;
    }

    setUniformUpdaterFn(updater: UniformUpdaterFn_t): ISubPipeline {
        this._uniformUpdaterFn = updater;
        return this;
    }

    setRenderObject(target: IRenderObject): ISubPipeline {
        this._renderObject = target;
        return this;
    }

    setTextures(...tex: Array<ITexture>): ISubPipeline {
        this._textureSet.length = 0;
        tex.forEach(t => {
            this._textureSet.push(t);
        });
        return this;
    }

    setTexture(texture: ITexture): ISubPipeline {
        if (!texture) return this;
        this._textureSet.length = 0;
        this._textureSet.push(texture);
        return this;
    }

    addTexture(texture: ITexture): ISubPipeline {
        if (!texture) return this;
        this._textureSet.push(texture);
        return this;
    }

    setMaterial(material: IMaterial): ISubPipeline {
        if (!material) return this;
        material.normalTexture ??= _pbrTextures[PBRTextureIndex_e.NORMAL];
        material.occlusionTexture ??= _pbrTextures[PBRTextureIndex_e.OCCLUSION];
        material.emissiveTexture ??= _pbrTextures[PBRTextureIndex_e.EMISSIVE];
        material.pbrMR_baseColorTexture ??= _pbrTextures[PBRTextureIndex_e.BASECOLOR];
        material.pbrMR_metallicRoughnessTexture ??= _pbrTextures[PBRTextureIndex_e.METALLICROUGHNESS];

        this._textureSet.push(material.normalTexture);
        this._textureSet.push(material.occlusionTexture);
        this._textureSet.push(material.emissiveTexture);
        this._textureSet.push(material.pbrMR_baseColorTexture);
        this._textureSet.push(material.pbrMR_metallicRoughnessTexture);
        return this;
    }

    clearTextures(): ISubPipeline {
        this._textureSet.length = 0;
        return this;
    }

    validate(): ISubPipeline {
        //TODO: fix this, recusive referrencing.;
        /*
        if (!(this._renderObject instanceof IRenderObject))
            log.vital('[SubPipeline] geometry is not a instance of Geometry.');
        */
        this._textureSet.forEach((tex) => {
            if (!(tex instanceof GLTexture))
                log.vital('[SubPipeline] textureSet has null-Texture object.');
        });
        return this;
    }

    bind(context: IRenderContext): void {
        context.bind(this._renderObject);
        //TODO: further improvments.
        let i = 0;
        this._textureSet.forEach(t => {
            t.bind(i);
            ++i;
        });
    }

    draw(): void {
        this._renderObject.drawCMD();
    }

    clone(): ISubPipeline {
        const sub = new GLSubPipeline();
        sub._renderObject = this._renderObject;
        this._textureSet.forEach(t => {
            sub._textureSet.push(t);
        });
        sub._uniformUpdaterFn = this._uniformUpdaterFn;
        return sub;
    }
}

const _wm_framebuffer = new WeakMap();

export class GLFramebuffer implements IFramebuffer {

    protected _glFramebuffer: WebGLFramebuffer;
    protected _gl: WebGL2RenderingContext;
    protected _width: number;
    protected _height: number;
    protected _arrTexture: ITexture[] = new Array();
    protected _depthTexture: ITexture;

    constructor(width: number, height: number) {
        this._width = width;
        this._height = height;
    }

    get criticalKey(): object { return GLFramebuffer; }

    readPixels(attachment: number = 0): Uint8Array {
        const gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
        gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachment);
        let _pixel = new Uint8Array(this._width * this._height * 4);
        gl.readPixels(0, 0, this._width, this._height, glC.RGBA, glC.UNSIGNED_BYTE, _pixel);
        return _pixel;
    }

    copyColorAttachmentToTexture(attachment: number, texture: ITexture, level: number = 0): void {
        const gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
        gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachment);
        gl.bindTexture(gl.TEXTURE_2D, _wm_texture.get(texture));
        gl.copyTexSubImage2D(gl.TEXTURE_2D, level, 0, 0, 0, 0, this._width, this._height);
    }

    saveTexture(attachment: number): void {
        let pixels = this.readPixels(attachment);

        let canvas = document.createElement("canvas");
        canvas.width = this._width;
        canvas.height = this._height;
        let ctx = canvas.getContext("2d");

        let imageData = ctx.createImageData(this._width, this._height);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);
        ctx.scale(1, -1);

        let link = document.createElement("a");
        link.download = "texture.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    }

    resize(width: number, height: number): void {
        this._width = width;
        this._height = height;

        this._arrTexture.forEach((t, index) => {
            if (!t) return;
            t.resize(width, height);
        });
        if (this._depthTexture) {
            this._depthTexture.resize(width, height);
        }

        this.destroy();
        this.createGPUResource(this._gl);
    }

    createGPUResource(gl: WebGL2RenderingContext): void {
        if (!gl) return;
        this._gl = gl;
        if (this._width * this._height != 0) {
            if (this._glFramebuffer) return;
            const target = gl.TEXTURE_2D;
            this._glFramebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
            _wm_framebuffer.set(this, this._glFramebuffer);

            this._arrTexture.forEach((t, index) => {
                if (!t) return;
                t.createGPUResource(gl);
                const _glTex = _wm_texture.get(t);
                gl.bindTexture(t.target, _glTex);
                if (t.target === glC.TEXTURE_CUBE_MAP) {
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, glC.TEXTURE_CUBE_MAP_POSITIVE_X + index, _glTex, 0);
                } else {
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, t.target, _glTex, 0);
                }
            });

            if (this._depthTexture) {
                this._depthTexture.createGPUResource(gl);
                const _glTex = _wm_texture.get(this._depthTexture);
                gl.bindTexture(target, _glTex);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, target, _glTex, 0);
            }

            gl.bindTexture(target, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
    }

    getColorTexture(attachment: number): ITexture {
        return this._arrTexture[attachment];
    }

    attachColorTexture(texture: ITexture, attachment: number, target?: GLenum): void {
        this._arrTexture[attachment] = texture;
    }

    attachDepthTexture(texture: ITexture, target?: number): void {
        this._depthTexture = texture;
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
        } else {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        }
        this.clear();
    }

    destroy() {
        this._glFramebuffer && this._gl.deleteFramebuffer(this._glFramebuffer);
        this._glFramebuffer = undefined;
    }
}

export class GLFramebuffer_C0_r32i extends GLFramebuffer {

    private _clearColor: Int32Array = new Int32Array(4).fill(0);
    private _pixel = new Int32Array(1);

    constructor(width: number, height: number) {
        super(width, height);
        this.attachColorTexture(new GLTexture(width, height, glC.R32I, glC.RED_INTEGER, glC.INT), 0);
        //
        // todo: change to render buffer depth .
        this.attachDepthTexture(new GLTexture(width, height, glC.DEPTH_COMPONENT16, glC.DEPTH_COMPONENT, glC.UNSIGNED_SHORT));
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
        gl.readPixels(x, this._height - y, 1, 1, glC.RED_INTEGER, glC.INT, this._pixel);
        return this._pixel[0];
    }
}

export class GLFramebuffer_C0_r32f extends GLFramebuffer {

    private _ref_texture_r32f: ITexture;
    //private _depthTexture: ITexture;
    //private _clearColor: Int32Array = new Int32Array(4).fill(0);
    //private _pixel = new Int32Array(1);

    constructor(width: number, height: number) {
        super(width, height);
        this._ref_texture_r32f = new GLTexture(width, height, glC.R32F, glC.RED, glC.FLOAT);
        this.attachColorTexture(this._ref_texture_r32f, 0);
        //
        // todo: change to render buffer depth .
        //this._depthTexture = new GLTexture(gl, gl.DEPTH_COMPONENT16, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT).createGLTextureWithSize(width, height);
        //this.attachDepthTexture(this._depthTexture);
    }

    get criticalKey(): object {
        return GLFramebuffer;
    }

    get colorTexture0(): ITexture {
        return this._ref_texture_r32f;
    }

    clear(): void {
        const gl = this._gl;
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
}

export class GLFramebuffer_Depth_f extends GLFramebuffer {

    constructor(width: number, height: number) {
        super(width, height);
        this._depthTexture = new GLTexture(width, height, glC.DEPTH_COMPONENT16, glC.DEPTH_COMPONENT, glC.UNSIGNED_SHORT);
        this._depthTexture.setParameter(glC.TEXTURE_COMPARE_MODE, glC.COMPARE_REF_TO_TEXTURE);
        this._depthTexture.setParameter(glC.TEXTURE_COMPARE_FUNC, glC.LEQUAL);
        this._depthTexture.setParameter(glC.TEXTURE_MIN_FILTER, glC.LINEAR);
        this._depthTexture.setParameter(glC.TEXTURE_MAG_FILTER, glC.LINEAR);
    }

    get criticalKey(): object {
        return GLFramebuffer;
    }

    get depthTexture(): ITexture {
        return this._depthTexture;
    }

    clears(): void {
        const gl = this._gl;
        gl.clearBufferfv(gl.DEPTH, 0, [1]);
    }
}

let _pbrTextures: ITexture[];
