import log from "./log.js"

export type DrawArraysParameter = {
    mode: GLenum,
    first: GLint,
    count: GLsizei
};
export type DrawElementsParameter = {
    mode: GLenum,
    count: GLsizei,
    type: GLenum,
    offset: GLintptr
};
export type BufferDescriptor = {
    size: GLint,
    type: GLenum,
    normalized: GLboolean,
    stride: GLsizei,
    offset: GLintptr
};

export function createGlContext(canvasElementId: string): { gl: WebGL2RenderingContext, canvas: HTMLCanvasElement } {
    const canvas: HTMLCanvasElement = document.getElementById(canvasElementId) as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2', { stencil: true });
    if (!gl) {
        log.vital("[gl] WebGL 2.0 not supported!");
    }
    //@ts-ignore
    window.gl = gl;// debug use;
    return { gl, canvas };
}

export type UniformUpdater = {
    [key: string]: (u: WebGLUniformLocation) => void;
}

const _wm_program = new WeakMap();
export class Program {
    private _glProgram: WebGLProgram;
    private _gl: WebGL2RenderingContext;
    private _mapUniform = new Map();

    constructor(gl: WebGL2RenderingContext, vsSource: string, fsSource: string) {
        this._gl = gl;
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vsSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            log.vital("Vertex shader compilation failed:", gl.getShaderInfoLog(vertexShader));
            gl.deleteShader(vertexShader);
            return;
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fsSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            log.vital("Fragment shader compilation failed:", gl.getShaderInfoLog(fragmentShader));
            gl.deleteShader(fragmentShader);
            return;
        }

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

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

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
    use(): Program {
        this._gl.useProgram(this._glProgram);
        return this;
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
    constructor(gl: WebGL2RenderingContext) {
        this._gl = gl;
    }

    get textureUnit(): GLint { return this._texUnit; }

    createGLTexture(data: any): Texture {
        if (!!this._glTexture) return this;
        const gl = this._gl;
        this._createTexture(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
        return this;
    }

    updateData(data: any, xoffset: number, yoffset: number, width: number, height: number): Texture {
        if (!this._glTexture) return this;
        const gl = this._gl;
        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, xoffset, yoffset, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        return this;
    }

    /**
    * defaults to gl.drawingBufferWidth and ...height
    * internalFormat defaults to gl.RGBA
    * format defaults to gl.RGBA
    * type defaults to gl.UNSIGNED_BYTE
    */
    createGLTextureWithSize(width: number, height: number, internalFormat?: GLint, format?: GLint, type?: GLenum): Texture {
        if (!!this._glTexture) return this;
        const gl = this._gl;
        this._createTexture(gl);
        internalFormat ??= gl.RGBA;
        format ??= gl.RGBA;
        type ??= gl.UNSIGNED_BYTE;
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width ?? gl.drawingBufferWidth, height ?? gl.drawingBufferHeight, 0, format, type, null);
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
export class Framebuffer {
    private _glFramebuffer: WebGLFramebuffer = null;
    private _gl: WebGL2RenderingContext;
    private _width;
    private _height;
    constructor(gl: WebGL2RenderingContext, width?: number, height?: number, isBackFBO = true) {
        this._gl = gl;
        this._width = width ?? gl.drawingBufferWidth;
        this._height = height ?? gl.drawingBufferHeight;
        if (isBackFBO) {
            this._glFramebuffer = gl.createFramebuffer();
        }
        _wm_framebuffer.set(this, this._glFramebuffer);
    }

    attachColorTexture(texture: Texture, attachment = 0, target?: number): Framebuffer {
        if (!this._glFramebuffer) return this;
        const gl = this._gl;
        target ??= gl.TEXTURE_2D;
        const _glTex = _wm_texture.get(texture);
        gl.bindTexture(target, _glTex);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + attachment, target, _glTex, 0);
        return this;
    }

    attachDepthTexture(texture: Texture, target?: number): Framebuffer {
        if (!this._glFramebuffer) return this;
        const gl = this._gl;
        target ??= gl.TEXTURE_2D;
        const _glTex = _wm_texture.get(texture);
        gl.bindTexture(target, _glTex);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, target, _glTex, 0);
        return this;
    }

    validate(): Framebuffer {
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._glFramebuffer);
        if (this._gl.checkFramebufferStatus(this._gl.FRAMEBUFFER) !== this._gl.FRAMEBUFFER_COMPLETE) log.vital("[Framebuffer] framebuffer is't setup correctly.");
        return this;
    }

    bind() {
        const gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
        gl.viewport(0, 0, this._width, this._height);
        //gl.clearColor(0.15, 0.15, 0.15, 1.0);
        //gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        return this;
    }
    unbind() {
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
        return this;
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
    private _enableCullFace = true;
    private _culledFace: GLenum;
    private _drawBuffers: GLenum[];
    constructor(gl: WebGL2RenderingContext) {
        this._gl = gl;
        this._culledFace = gl.BACK;
    }

    setFBO(fbo: Framebuffer): Pipeline { this.FBO = fbo; return this; }
    setProgram(program: Program): Pipeline { this.program = program; return this; }
    appendSubPipeline(subp: SubPipeline, option?: SubPipelineOption): Pipeline {
        let _onlyOnce = (option?.onlyOnce) ? true : false;
        _onlyOnce ? this._arrOneTimeSubPipeline.push(subp) : this._arrSubPipeline.push(subp);
        return this;
    }
    cullFace(enable: boolean, culledFace: GLenum): Pipeline {
        this._enableCullFace = enable;
        this._culledFace = culledFace;
        return this;
    }
    drawBuffers(...buffers: GLenum[]): Pipeline {
        this._drawBuffers = buffers;
        return this;
    }


    validate(): Pipeline {
        if (!(this.FBO && this.FBO instanceof Framebuffer))
            log.vital('[Pipeline] frame buffer is not exist OR is not a valid Framebuffer instance.');
        if (!(this.program && this.program instanceof Program))
            log.vital('[Pipeline] program is not exist OR is not a valid Program instance.');
        //todo:
        return this;
    }

    execute(): Pipeline {
        if (this._arrSubPipeline.length <= 0) return this;
        this.FBO.bind();
        this.program.use();

        const gl = this._gl;
        //gl.depthRange(0.0, 1.0);
        //gl.enable(gl.BLEND);
        //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        //gl.blendEquation(gl.FUNC_ADD);
        if (this._enableCullFace) {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(this._culledFace);
        } else gl.disable(gl.CULL_FACE);

        this._drawBuffers && gl.drawBuffers(this._drawBuffers);

        this._arrSubPipeline.forEach(subp => {
            subp.bind(gl);
            this.program.updateUniforms(subp.uniformUpdater);
            subp.draw(gl);
        });

        if (this._arrOneTimeSubPipeline.length <= 0) return this;
        this._arrOneTimeSubPipeline.forEach(subp => {
            subp.bind(gl);
            this.program.updateUniforms(subp.uniformUpdater);
            subp.draw(gl);
        });
        this._arrOneTimeSubPipeline.length = 0;
        return this;
    }
}

export class SubPipeline {
    VAO: WebGLVertexArrayObject;
    arrTextures: Array<Texture | SkyboxTexture> = [];
    uniformUpdater: UniformUpdater;
    private _isVertexMethod = false;// I prefer elements mode;
    private _drawParameter: DrawArraysParameter | DrawElementsParameter;
    constructor() { }

    setUniformUpdater(updater: UniformUpdater): SubPipeline {
        this.uniformUpdater = updater;
        return this;
    }

    setVAO(vao: WebGLVertexArrayObject): SubPipeline {
        this.VAO = vao;
        return this;
    }
    setTextures(...tex: Array<Texture | SkyboxTexture>): SubPipeline {
        this.arrTextures.push(...tex);
        return this;
    }
    setDrawArraysParameters(args: DrawArraysParameter): SubPipeline {
        this._drawParameter = args;
        this._isVertexMethod = true;
        return this;
    }
    setDrawElementsParameters(args: DrawElementsParameter): SubPipeline {
        this._drawParameter = args;
        this._isVertexMethod = false;
        return this;
    }

    validate(): SubPipeline {
        this.arrTextures.forEach((tex) => {
            if (!(tex instanceof Texture))
                log.vital('[SubPipeline] arrTextures has null-Texture object.');
        });
        if (!this.uniformUpdater) log.vital('[Pipeline] uniform updater is not exist.');
        return this;
    }

    bind(gl: WebGL2RenderingContext): SubPipeline {
        gl.bindVertexArray(this.VAO);
        //TODO: further improvments.
        for (let i = 0, N = this.arrTextures.length; i < N; ++i) {
            this.arrTextures[i].bind(i);
        };
        return this;
    }

    draw(gl: WebGL2RenderingContext): SubPipeline {
        if (this._isVertexMethod) {
            gl.drawArrays(
                (this._drawParameter as DrawArraysParameter).mode,
                (this._drawParameter as DrawArraysParameter).first,
                (this._drawParameter as DrawArraysParameter).count
            );
        } else {
            gl.drawElements(
                (this._drawParameter as DrawElementsParameter).mode,
                (this._drawParameter as DrawElementsParameter).count,
                (this._drawParameter as DrawElementsParameter).type,
                (this._drawParameter as DrawElementsParameter).offset
            );
        }
        return this;
    }

    clone(): SubPipeline {
        const sub = new SubPipeline();
        sub.VAO = this.VAO;
        sub.arrTextures.push(...this.arrTextures);
        sub.uniformUpdater = this.uniformUpdater;
        sub._drawParameter = this._drawParameter;
        sub._isVertexMethod = this._isVertexMethod;
        return sub;
    }
}

export type PipelineOption = SubPipelineOption;
export class Renderer {
    private _maxTextureUnits: number;
    //private _renderState;
    private _arrPipeline: Pipeline[] = [];
    private _arrOneTimePipeline: Pipeline[] = [];
    private _arrTransparentPipeline: Pipeline[] = [];

    private _gl: WebGL2RenderingContext;
    constructor(gl: WebGL2RenderingContext) {
        this._gl = gl;
        this._maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    }

    render(): Renderer {
        const gl = this._gl;
        gl.enable(gl.DEPTH_TEST);
        //gl.clearDepth(0.5);
        gl.depthFunc(gl.LESS);
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

    addPipeline(p: Pipeline, option?: PipelineOption): Renderer {
        let _onlyOnce = (option?.onlyOnce) ? true : false;
        _onlyOnce ? this._arrOneTimePipeline.push(p) : this._arrPipeline.push(p);
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
    /*
    #sortPipline() {
        //TODO:
    }
    */
}

