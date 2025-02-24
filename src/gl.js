if (!CG.vital) CG.vital("log.js file should be loaded first!");
window.CG ??= {};


(function () {
    function createGlContext(canvasElementId) {
        const canvas = document.getElementById(canvasElementId);
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            CG.vital("WebGL 2.0 not supported!");
        }
        return { gl, canvas };
    }

    function createProgramWrapper(gl, vsSource, fsSource) {
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vsSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            CG.vital("Vertex shader compilation failed:", gl.getShaderInfoLog(vertexShader));
            gl.deleteShader(vertexShader);
            return null;
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fsSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            CG.vital("Fragment shader compilation failed:", gl.getShaderInfoLog(fragmentShader));
            gl.deleteShader(fragmentShader);
            return null;
        }

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            CG.vital("Shader program linking failed:", gl.getProgramInfoLog(shaderProgram));
            gl.deleteProgram(shaderProgram);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return null;
        }

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        const bindAttribute = (name, size, type, normalized = false, stride = 0, offset = 0) => {
            const _loc = gl.getAttribLocation(shaderProgram, name);
            //CG.info('[gl.js] attribute location is:', _loc);
            gl.enableVertexAttribArray(_loc);
            gl.vertexAttribPointer(_loc, size, type, normalized, stride, offset);
        };
        const getAttribLocation = (name) => {
            return gl.getAttribLocation(shaderProgram, name);
        };
        const getUniformLocation = (name) => {
            //CG.info('[gl.js] uniform location is:', gl.getUniformLocation(shaderProgram, name));
            return gl.getUniformLocation(shaderProgram, name);
        };
        const deleteProgram = () => {
            gl.deleteProgram(shaderProgram);
        };
        const useProgram = () => {
            gl.useProgram(shaderProgram);
        };

        return Object.freeze({
            shaderProgram,
            bindAttribute,
            getUniformLocation,
            getAttribLocation,
            useProgram,
            deleteProgram,
        });
    }

    const _wm_program = new WeakMap();
    class Program {
        #_glProgram;
        #_gl;
        #_uniformUpdater;
        #_mapUniform = new Map();
        constructor(gl, vsSource, fsSource) {
            this.#_gl = gl;
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, vsSource);
            gl.compileShader(vertexShader);

            if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
                CG.vital("Vertex shader compilation failed:", gl.getShaderInfoLog(vertexShader));
                gl.deleteShader(vertexShader);
                return;
            }

            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragmentShader, fsSource);
            gl.compileShader(fragmentShader);

            if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
                CG.vital("Fragment shader compilation failed:", gl.getShaderInfoLog(fragmentShader));
                gl.deleteShader(fragmentShader);
                return;
            }

            const shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                CG.vital("Shader program linking failed:", gl.getProgramInfoLog(shaderProgram));
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
                    this.#_mapUniform.set(uniformInfo.name, _u);
                } else {
                    CG.vital("[gl.js] can't get uniform info.");
                }
            }

            this.#_glProgram = shaderProgram;
            _wm_program.set(this, shaderProgram);
        }
        getAttribLocation(name) {
            return this.#_gl.getAttribLocation(this.#_glProgram, name);
        }
        setUniformUpdater(updater) {
            this.#_uniformUpdater = updater;
            return this;
        }
        updateUniforms() {
            const _upt = this.#_uniformUpdater;
            this.#_mapUniform.forEach((v, k) => {
                _upt[`update${k}`](v);
            });
            return this;
        }
        use() {
            this.#_gl.useProgram(this.#_glProgram);
            return this;
        };

        destroy() {
            this.#_gl.deleteProgram(this.#_glProgram);
            this.#_glProgram = undefined;
            this.#_gl = undefined;
        }
    }

    const _wm_texture = new WeakMap();
    class Texture {
        #_glTexture;
        #_gl;
        #_texUnit = -1;
        constructor(gl) {
            this.#_gl = gl;
        }

        get textureUnit() { return this.#_texUnit; }

        createGLTexture(data) {
            if (!!this.#_glTexture) return;
            const gl = this.#_gl;
            this.#_createTexture(gl);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
            return this;
        }

        /**
        * defaults to gl.drawingBufferWidth and ...height
        */
        createGLTextureWithSize(width, height) {
            if (!!this.#_glTexture) return;
            const gl = this.#_gl;
            this.#_createTexture(gl);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width ?? gl.drawingBufferWidth, height ?? gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            return this;
        }

        #_createTexture(gl) {
            const _texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, _texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            this.#_glTexture = _texture;
            _wm_texture.set(this, _texture);
        }

        setParameter(name, value) {
            if (!this.#_glTexture) return;
            this.#_gl.texParameteri(gl.TEXTURE_2D, name, value);
        }

        bind(textureUnit) {
            const gl = this.#_gl;
            gl.activeTexture(gl.TEXTURE0 + textureUnit);
            gl.bindTexture(gl.TEXTURE_2D, this.#_glTexture);
            this.#_texUnit = textureUnit;
            return this;
        }

        destroyGLTexture() {
            const gl = this.#_gl;
            gl.deleteTexture(this.#_glTexture);
            this.#_glTexture = undefined;
            return this;
        }
    }

    const _wm_framebuffer = new WeakMap();
    class Framebuffer {
        #_glFramebuffer = null;
        #_gl;
        constructor(gl, isBackFBO = true) {
            this.#_gl = gl;
            if (isBackFBO) {
                this.#_glFramebuffer = gl.createFramebuffer();
            }
            _wm_framebuffer.set(this, this.#_glFramebuffer);
        }

        attachColorTexture(texture, attachment = 0, target = undefined) {
            if (!this.#_glFramebuffer) return this;
            const gl = this.#_gl;
            target ??= gl.TEXTURE_2D;
            const _glTex = _wm_texture.get(texture);
            gl.bindTexture(target, _glTex);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.#_glFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + attachment, target, _glTex, 0);
            return this;
        }

        bind() {
            this.#_gl.bindFramebuffer(gl.FRAMEBUFFER, this.#_glFramebuffer);
            return this;
        }
        unbind() {
            this.#_gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return this;
        }

        destroy() {
            this.#_glFramebuffer && this.#_gl.deleteFrameBuffer(this.#_glFramebuffer);
        }
    }

    class Pipeline {
        FBO;
        program;
        VAO;
        arrTextures = [];

        #_gl;
        #_drawParameter;
        #_isVertexMethod = false;// I prefer elements mode;
        constructor(gl) {
            this.#_gl = gl;
        }

        setFBO(fbo) { this.FBO = fbo; return this; }
        setProgram(program) { this.program = program; return this; }
        setVAO(vao) { this.VAO = vao; return this; }
        setTextures(...tex) {
            this.arrTextures.length = 0;
            this.arrTextures.push(...tex);
            return this;
        }

        setDrawArraysParameters(...args) {
            this.#_drawParameter = args;
            this.#_isVertexMethod = true;
            return this;
        }
        setDrawElementsParameters(...args) {
            this.#_drawParameter = args;
            this.#_isVertexMethod = false;
            return this;
        }

        validate() {
            const gl = this.#_gl;
            let r = this.FBO && this.FBO instanceof CG.glWrapper.Framebuffer;
            if (!r) {
                CG.vital('[Pipeline] frame buffer is not exist OR is not a valid Framebuffer instance.');
            }
            r = this.program && this.program instanceof CG.glWrapper.Program;
            if (!r) {
                CG.vital('[Pipeline] program is not exist OR is not a valid Program instance.');
            }
            r = this.VAO && gl.isVertexArray(this.VAO);
            if (!r) {
                CG.vital('[Pipeline] VAO is not exist OR is not a valid gl vertex array object.');
            }
            //todo:
            return this;
        }

        execute() {
            this.FBO.bind();

            const gl = this.#_gl;
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LESS);
            gl.depthRange(0.0, 1.0);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.blendEquation(gl.FUNC_ADD);

            gl.bindVertexArray(this.VAO);
            this.arrTextures.forEach((t) => {
                t.bind(1);
            });
            this.program.use().updateUniforms();
            if (this.#_isVertexMethod) {
                gl.drawArrays(...this.#_drawParameter);
            } else {
                gl.drawElements(...this.#_drawParameter);
            }
            return this;
        }
    }


    window.CG.glWrapper = Object.freeze({
        Program,
        Texture,
        Framebuffer,
        Pipeline,
    });
    window.CG.createGlContext = createGlContext;
    CG.warn("[gl.js] createProgramWrapper under CG has been deprecated!");
    window.CG.createProgramWrapper = createProgramWrapper;
    CG.info('[gl.js] loaded.');
})()

