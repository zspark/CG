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
        constructor(gl) { this.#_gl = gl; }

        createGLTexture(data) {
            if (!!this.#_glTexture) return;
            const gl = this.#_gl;
            const _texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, _texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
            this.#_setDefaultParameters(gl);
            this.#_glTexture = _texture;
            _wm_texture.set(this, _texture);
            return this;
        }

        /**
        * defaults to gl.drawingBufferWidth and ...height
        */
        createGLTextureWithSize(width, height) {
            if (!!this.#_glTexture) return;
            const gl = this.#_gl;
            const _texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, _texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width ?? gl.drawingBufferWidth, height ?? gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            this.#_setDefaultParameters(gl);
            this.#_glTexture = _texture;
            _wm_texture.set(this, _texture);
            return this;
        }

        #_setDefaultParameters(gl) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        setParameter(name, value) {
            if (!this.#_glTexture) return;
            this.#_gl.texParameteri(gl.TEXTURE_2D, name, value);
        }

        bindTexture(textureUnit = 0) {
            const gl = this.#_gl;
            gl.activeTexture(gl.TEXTURE0 + textureUnit);
            gl.bindTexture(gl.TEXTURE_2D, this.#_glTexture);
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
        #_glFramebuffer;
        #_gl;
        constructor(gl) {
            this.#_gl = gl;
            this.#_glFramebuffer = gl.createFramebuffer();
            _wm_framebuffer.set(this, this.#_glFramebuffer);
        }

        attachColorTexture(texture, attachment = 0, textarget = undefined) {
            const gl = this.#_gl;
            textarget ??= gl.TEXTURE_2D;
            const _glTex = _wm_texture.get(texture);
            gl.bindTexture(textarget, _glTex);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.#_glFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + attachment, textarget, _glTex, 0);
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
        }
    }


    window.CG.glWrapper = Object.freeze({
        Program,
        Texture,
        Framebuffer,
    });
    window.CG.createGlContext = createGlContext;
    CG.warn("[gl.js] createProgramWrapper under CG has been deprecated!");
    window.CG.createProgramWrapper = createProgramWrapper;
    CG.info('[gl.js] loaded.');
})()

