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
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        log.vital("[gl] WebGL 2.0 not supported!");
    }
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
    use(uniformUpdater: UniformUpdater) {
        this._gl.useProgram(this._glProgram);
        this._mapUniform.forEach((v, k) => {
            uniformUpdater[`update${k}`](v);
        });
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
    private _texUnit: number = -1;
    constructor(gl: WebGL2RenderingContext) {
        this._gl = gl;
    }

    get textureUnit(): number { return this._texUnit; }

    createGLTexture(data: any): Texture {
        if (!!this._glTexture) return;
        const gl = this._gl;
        this.#_createTexture(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
        return this;
    }

    updateData(data: any, xoffset: number, yoffset: number, width: number, height: number): Texture {
        if (!this._glTexture) return;
        const gl = this._gl;
        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, xoffset, yoffset, width, width, gl.RGBA, gl.UNSIGNED_BYTE, data);
        return this;
    }

    /**
    * defaults to gl.drawingBufferWidth and ...height
    */
    createGLTextureWithSize(width: number, height: number): Texture {
        if (!!this._glTexture) return;
        const gl = this._gl;
        this.#_createTexture(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width ?? gl.drawingBufferWidth, height ?? gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        return this;
    }

    #_createTexture(gl: WebGL2RenderingContext) {
        const _texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, _texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        this._glTexture = _texture;
        _wm_texture.set(this, _texture);
    }

    setParameter(name: number, value: number) {
        if (!this._glTexture) return;
        this._gl.texParameteri(this._gl.TEXTURE_2D, name, value);
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

const _wm_framebuffer = new WeakMap();
export class Framebuffer {
    private _glFramebuffer: WebGLFramebuffer = null;
    private _gl: WebGL2RenderingContext;
    constructor(gl: WebGL2RenderingContext, isBackFBO = true) {
        this._gl = gl;
        if (isBackFBO) {
            this._glFramebuffer = gl.createFramebuffer();
        }
        _wm_framebuffer.set(this, this._glFramebuffer);
    }

    attachColorTexture(texture: Texture, attachment = 0, target: number = undefined) {
        if (!this._glFramebuffer) return this;
        const gl = this._gl;
        target ??= gl.TEXTURE_2D;
        const _glTex = _wm_texture.get(texture);
        gl.bindTexture(target, _glTex);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + attachment, target, _glTex, 0);
        return this;
    }

    bind() {
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._glFramebuffer);
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

export class Pipeline {
    FBO: Framebuffer;
    program: Program;
    VAO: WebGLVertexArrayObject;
    arrTextures: Texture[] = [];

    private _gl: WebGL2RenderingContext;
    private _drawParameter: DrawArraysParameter | DrawElementsParameter;
    private _isVertexMethod = false;// I prefer elements mode;
    private _uniformUpdater: UniformUpdater;
    private _enableCullFace = true;
    constructor(gl: WebGL2RenderingContext) {
        this._gl = gl;
    }

    cullFace(enable: boolean): Pipeline {
        this._enableCullFace = enable;
        return this;
    }

    setFBO(fbo: Framebuffer): Pipeline { this.FBO = fbo; return this; }
    setProgram(program: Program): Pipeline { this.program = program; return this; }
    setVAO(vao: WebGLVertexArrayObject): Pipeline { this.VAO = vao; return this; }
    setTextures(...tex: Texture[]): Pipeline {
        this.arrTextures.length = 0;
        this.arrTextures.push(...tex);
        return this;
    }

    setDrawArraysParameters(args: DrawArraysParameter): Pipeline {
        this._drawParameter = args;
        this._isVertexMethod = true;
        return this;
    }

    setUniformUpdater(updater: UniformUpdater): Pipeline {
        this._uniformUpdater = updater;
        return this;
    }

    setDrawElementsParameters(args: DrawElementsParameter): Pipeline {
        this._drawParameter = args;
        this._isVertexMethod = false;
        return this;
    }

    validate(): Pipeline {
        const gl = this._gl;
        if (!(this.FBO && this.FBO instanceof Framebuffer))
            log.vital('[Pipeline] frame buffer is not exist OR is not a valid Framebuffer instance.');
        if (!(this.program && this.program instanceof Program))
            log.vital('[Pipeline] program is not exist OR is not a valid Program instance.');
        if (!(this.VAO && gl.isVertexArray(this.VAO)))
            log.vital('[Pipeline] VAO is not exist OR is not a valid gl vertex array object.');
        if (!this._uniformUpdater) log.vital('[Pipeline] uniform updater is not exist.');
        //todo:
        return this;
    }

    execute(): Pipeline {
        this.FBO.bind();

        const gl = this._gl;
        this._enableCullFace ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
        gl.depthRange(0.0, 1.0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.blendEquation(gl.FUNC_ADD);

        gl.bindVertexArray(this.VAO);
        //TODO: further improvments.
        for (let i = 0, N = this.arrTextures.length; i < N; ++i) {
            this.arrTextures[i].bind(i);
        };
        this.program.use(this._uniformUpdater);
        if (this._isVertexMethod) {
            gl.drawArrays((this._drawParameter as DrawArraysParameter).mode, (this._drawParameter as DrawArraysParameter).first, (this._drawParameter as DrawArraysParameter).count);
        } else {
            gl.drawElements((this._drawParameter as DrawElementsParameter).mode, (this._drawParameter as DrawElementsParameter).count, (this._drawParameter as DrawElementsParameter).type, (this._drawParameter as DrawElementsParameter).offset);
        }
        return this;
    }
}

export class Renderer {
    private _maxTextureUnits: number;
    //private _renderState;
    private _arrPipeline: Pipeline[] = [];
    private _arrTransparentPipeline: Pipeline[] = [];

    private _gl: WebGL2RenderingContext;
    constructor(gl: WebGL2RenderingContext) {
        this._gl = gl;
        this._maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    }

    render(): Renderer {
        const gl = this._gl;
        gl.clearColor(0.2, 0.2, 0.2, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        this._arrPipeline.forEach((p) => {
            p.execute();
        });
        gl.disable(gl.DEPTH_TEST);
        this._arrTransparentPipeline.forEach((p) => {
            p.execute();
        });
        return this;
    }

    addPipeline(...p: Pipeline[]): Renderer {
        this._arrPipeline.push(...p);
        return this;
    }
    addTransparentPipeline(...p: Pipeline[]): Renderer {
        this._arrTransparentPipeline.push(...p);
        return this;
    }

    /*
    #sortPipline() {
        //TODO:
    }
    */
}

