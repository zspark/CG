if (!CG.log) CG.vital("log.js file should be loaded first!");
window.CG ??= {};


(function () {
    function createCube(edgeLength) {
        const _half = edgeLength * .5;
        const vertices = new Float32Array([
            -_half, -_half, _half, // 前下左 0
            _half, -_half, _half, // 前下右 1
            _half, _half, _half, // 前上右 2
            -_half, _half, _half, // 前上左 3
            -_half, -_half, -_half, // 后下左 4
            _half, -_half, -_half, // 后下右 5
            _half, _half, -_half, // 后上右 6
            -_half, _half, -_half, // 后上左 7
        ]);

        const indices = new Uint16Array([
            0, 1, 2, 0, 2, 3, // 前面
            0xFFFF,
            1, 5, 6, 1, 6, 2, // 右面
            0xFFFF,
            5, 4, 7, 5, 7, 6, // 后面
            0xFFFF,
            4, 0, 3, 4, 3, 7, // 左面
            0xFFFF,
            3, 2, 6, 3, 6, 7, // 上面
            0xFFFF,
            0, 4, 5, 0, 5, 1, // 下面
        ]);

        const colors = new Uint8Array([
            255, 0, 0,//0
            0, 255, 0,//1
            0, 0, 255,//2
            255, 255, 255,//3
            0, 0, 255,//4
            255, 255, 255,//5
            255, 0, 0,//6
            0, 255, 0,//7
        ]);

        return {
            vertices: vertices,
            indices: indices,
            colors: colors,
        };
    }

    function createPlane(width, height) {
        return {
            vertices: new Float32Array([
                width, height, 0,
                -width, height, 0,
                -width, -height, 0,
                width, -height, 0,
            ]),
            indices: new Uint16Array([
                0, 1, 2,
                2, 3, 0
            ]),
            colors: new Uint8Array([
                /*
                255, 0, 0,
                0, 255, 0,
                0, 0, 255,
                255, 255, 255,
                */
                255, 255, 255,
                0, 0, 0,
                0, 0, 0,
                255, 255, 255,
            ])
        }
    }

    function createTriangle() {
        return {
            vertices: new Float32Array([
                0.7, -0.3, 0,
                0, 0.7, 0,
                -0.7, -0.3, 0,
            ]),
            indices: new Uint16Array([
                0, 1, 2,
            ]),
            colors: new Uint8Array([
                255, 0, 0,
                0, 255, 0,
                0, 0, 255,
            ])
        }
    }

    function createGridPlane_lines(quaterSize, step = 1) {
        const vertices = [];

        let _start = -Math.floor(quaterSize / step) * step;
        for (let t = _start; t <= quaterSize; t += step) {
            vertices.push(
                t, 0, -quaterSize,
                t, 0, quaterSize,
                -quaterSize, 0, t,
                quaterSize, 0, t
            );
        }

        return {
            vertices: new Float32Array(vertices),
        };
    }

    /**
    * Geometry is a mathmatical shape, shared with man meshes.
    *
    * position attribute must use FLOAT;
    * normal attribute must use FLOAT;
    * color attribute must use FLOAT, should be clamped to [0, 1];
    * index must use UNSIGNED_SHORT;
    *
    * gl.FLOAT 5126
    * gl.UNSIGNED_SHORT 5123
    */
    class Geometry {
        static createCube(edgeLength) {
            const _half = edgeLength * .5;
            const vertices = new Float32Array([
                -_half, -_half, _half, // 前下左 0
                1, 0, 0,//0
                _half, -_half, _half, // 前下右 1
                0, 1, 0,//1
                _half, _half, _half, // 前上右 2
                0, 0, 1,//2
                -_half, _half, _half, // 前上左 3
                1, 1, 1,//3
                -_half, -_half, -_half, // 后下左 4
                0, 0, 1,//4
                _half, -_half, -_half, // 后下右 5
                1, 1, 1,//5
                _half, _half, -_half, // 后上右 6
                1, 0, 0,//6
                -_half, _half, -_half, // 后上左 7
                0, 1, 0,//7
            ]);

            const indices = new Uint16Array([
                0, 1, 2, 0, 2, 3, // 前面
                1, 5, 6, 1, 6, 2, // 右面
                5, 4, 7, 5, 7, 6, // 后面
                4, 0, 3, 4, 3, 7, // 左面
                3, 2, 6, 3, 6, 7, // 上面
                0, 4, 5, 0, 5, 1, // 下面
            ]);

            return new Geometry(vertices, indices)
                .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, 5126, false, 24, 0)
                .setAttributeLayout(Geometry.ATTRIB_COLOR, 3, 5126, false, 24, 12);

        }

        static createGridPlane(quaterSize, step = 1) {
            const { vertices } = CG.geometry.createGridPlane_lines(quaterSize, step);
            return new Geometry(vertices)
                .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, 5126, false, 0, 0);
        }

        static createPlane(width, height) {
            const vertices = new Float32Array([
                width, height, 0,
                0.0, 0.0,
                -width, height, 0,
                1.0, 0.0,
                -width, -height, 0,
                1.0, 1.0,
                width, -height, 0,
                0.0, 1.0,
            ]);
            const indices = new Uint16Array([
                0, 1, 2,
                2, 3, 0
            ]);
            return new Geometry(vertices, indices)
                .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, 5126, false, 20, 0)
                .setAttributeLayout(Geometry.ATTRIB_TEXTURE_UV, 2, 5126, false, 20, 12);
        }

        static assembleFromGLTF(glftContent) {
            CG.info("[geometry.js] need implementation.");
            //TODO:
        }

        static ATTRIB_POSITION = 0;
        static ATTRIB_TEXTURE_UV = 1;
        static ATTRIB_NORMAL = 2;
        static ATTRIB_COLOR = 3;

        #_inited = false;
        #_vertices;
        #_indices;
        #_glVAO;
        #_glVertexBuffer;
        #_glIndexBuffer;
        #_attributeLayouts = new Array(15);
        #_vertexBufferLength = -1;
        #_indexBufferLength = -1;

        constructor(vertices, indices) {
            this.#_vertices = vertices;
            this.#_indices = indices;
        }

        get vertexBufferLength() {
            return this.#_vertexBufferLength;
        }

        get indexBufferLength() {
            return this.#_indexBufferLength;
        }

        get VAO() {
            return this.#_glVAO;
        }

        /**
        * create gl buffers and record to VAO.
        */
        init(gl, usage = undefined) {
            if (this.#_inited) return this;

            this.#_glVAO = gl.createVertexArray();
            gl.bindVertexArray(this.#_glVAO);

            usage ??= gl.STATIC_DRAW;
            if (this.#_vertices && !this.#_glVertexBuffer) {
                this.#_glVertexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.#_glVertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, this.#_vertices, usage);
                this.#_vertexBufferLength = this.#_vertices.length;

                this.#_attributeLayouts.forEach((v, i) => {
                    if (v) {
                        gl.enableVertexAttribArray(i);
                        gl.vertexAttribPointer(i, ...v);
                    }
                });
            }

            if (this.#_indices && !this.#_glIndexBuffer) {
                this.#_glIndexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#_glIndexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.#_indices, usage);
                this.#_indexBufferLength = this.#_indices.length;
            }
            gl.bindVertexArray(null);

            this.#_indices = this.#_vertices = undefined;
            return this;
        }

        setAttributeLayout(attributeName, size, type, normalized, stride, offset) {
            this.#_attributeLayouts[attributeName] = [size, type, normalized, stride, offset];
            return this;
        }

        destroyGLObjects(gl) {
            if (!!this.#_glVertexBuffer) gl.deleteBuffer(this.#_glVertexBuffer);
            if (!!this.#_glIndexBuffer) gl.deleteBuffer(this.#_glIndexBuffer);
            this.#_attributeLayouts = {};
            this.#_glIndexBuffer = this.#_glIndexBuffer = undefined;

            gl.deleteVertexArray(this.#_glVAO);
            this.#_glVAO = undefined;
            return this;
        }
    }

    window.CG.Geometry = Geometry;
    CG.warn("[geometry.js] all methods under 'geometry' object are deprecated! use CG.Geometry [class] instead.");
    window.CG.geometry = Object.freeze({
        createCube,
        createPlane,
        createTriangle,
        createGridPlane_lines,
    });
    CG.info('[geometry.js] loaded.');
})()

