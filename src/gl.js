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

            this.#_glProgram = shaderProgram;
        }
        getAttribLocation(name) {
            return this.#_gl.getAttribLocation(this.#_glProgram, name);
        }
        getUniformLocation(name) {
            //CG.info('[gl.js] uniform location is:', gl.getUniformLocation(shaderProgram, name));
            return this.#_gl.getUniformLocation(this.#_glProgram, name);
        }
        use() {
            this.#_gl.useProgram(this.#_glProgram);
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
        constructor() { }

        createGLTexture(gl, data) {
            if (!!this.#_glTexture) return;
            const _texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, _texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            this.#_glTexture = _texture;
            _wm_texture.set(this, _texture);
            return this;
        }

        bindTexture(gl, textureUnit = 0) {
            gl.activeTexture(gl.TEXTURE0 + textureUnit);
            gl.bindTexture(gl.TEXTURE_2D, this.#_glTexture);
            return this;
        }

        destroyGLTexture(gl) {
            gl.deleteTexture(this.#_glTexture);
            this.#_glTexture = undefined;
            return this;
        }
    }


    window.CG.glWrapper = Object.freeze({
        Program,
        Texture,
    });
    window.CG.createGlContext = createGlContext;
    CG.warn("[gl.js] createProgramWrapper under CG has been deprecated!");
    window.CG.createProgramWrapper = createProgramWrapper;
    CG.info('[gl.js] loaded.');
})()

