import log from "./log.js";
import glC from "./gl-const.js";
import { IBindableObject } from "./gl.js";

type drawType = 0 | 1 | 2 | 3 | 4;
export type DrawArraysInstancedParameter = {
    method?: drawType;
    mode: GLenum,
    first: GLint,
    count: GLsizei,
    instanceCount: GLsizei,
};
export type DrawArraysParameter = {
    method?: drawType;
    mode: GLenum,
    first: GLint,
    count: GLsizei
};
export type DrawElementsParameter = {
    method?: drawType;
    mode: GLenum,
    count: GLsizei,
    type: GLenum,
    offset: GLintptr
};

type BufferDescriptor = {
    size: GLint,
    type: GLenum,
    normalized: GLboolean,
    stride: GLsizei,
    offset: GLintptr
};


export interface IGeometry extends IBindableObject {
    readonly vertexBufferLength: number;
    readonly indexBufferLength: number;
    readonly drawCMD: () => void;

    /**
    * create gl buffers and record to VAO.
    */
    init(gl: WebGL2RenderingContext, usage?: number): IGeometry;
    appendInstancedData(data: Float32Array, divisor: number, usage: GLenum): IGeometry;
    updateInstancedData(): IGeometry;
    setAttributeLayout(attributeName: number, size: number, type: number, normalized: boolean, stride: number, offset: number): IGeometry;
    destroyGLObjects(gl: WebGL2RenderingContext): IGeometry;

    bindDrawCMD(): IGeometry;
    setDrawArraysParameters(mode: GLenum, first: GLint, count: GLsizei): IGeometry;
    setDrawArraysInstancedParameters(mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei): IGeometry;
    setDrawElementsParameters(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr): IGeometry
}

export const geometry: {
    createAxes: (length: number) => IGeometry,
    createCube: (length: number) => IGeometry,
    createPlane: (width: number, height: number) => IGeometry,
    createGridPlane: (length: number) => IGeometry,
    createFrontQuad: () => IGeometry,
    createTriangle: (scale: number) => IGeometry,
} = {
    /*
    assembleFromGLTF(glftContent) :Geometry{
        CG.info("[geometry.js] need implementation.");
        //TODO:
    }
    */

    createAxes: (length: number = 1): IGeometry => {
        const vertices = new Float32Array([
            0, 0, 0,/*color*/ 1, 0.2, 0.2,/**/ length, 0, 0,/*color*/ 1, 0, 0, // x;
            0, 0, 0,/*color*/ 0.2, 1, 0.2,/**/ 0, length, 0,/*color*/ 0, 1, 0, // x;
            0, 0, 0,/*color*/ 0.2, 0.2, 1,/**/ 0, 0, length,/*color*/ 0, 0, 1, // x;
        ]);
        return new Geometry(vertices)
            .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, glC.FLOAT, false, 24, 0)
            .setAttributeLayout(Geometry.ATTRIB_COLOR, 3, glC.FLOAT, false, 24, 12)
            .setDrawArraysParameters(glC.LINES, 0, vertices.length)

    },

    createCube: (edgeLength: number): IGeometry => {
        const _half = edgeLength * .5;
        const vertices = new Float32Array([
            // Front face
            -_half, -_half, _half, 0, 0, 1, 1, 0, 0,// Vertex 0
            _half, -_half, _half, 0, 0, 1, 0, 1, 0,// Vertex 1
            _half, _half, _half, 0, 0, 1, 0, 0, 1,// Vertex 2
            -_half, _half, _half, 0, 0, 1, 1, 1, 0,// Vertex 3

            // Back face
            -_half, -_half, -_half, 0, 0, -1, 1, 0, 1,// Vertex 4
            -_half, _half, -_half, 0, 0, -1, 0, 1, 1,// Vertex 5
            _half, _half, -_half, 0, 0, -1, 1, 1, 1,// Vertex 6
            _half, -_half, -_half, 0, 0, -1, 0, 0, 0,// Vertex 7

            // Top face
            -_half, _half, -_half, 0, 1, 0, 0, 1, 1,// Vertex 8
            -_half, _half, _half, 0, 1, 0, 1, 1, 0,// Vertex 9
            _half, _half, _half, 0, 1, 0, 0, 0, 1,// Vertex 10
            _half, _half, -_half, 0, 1, 0, 1, 1, 1,// Vertex 11

            // Bottom face
            -_half, -_half, -_half, 0, -1, 0, 1, 0, 1,// Vertex 12
            _half, -_half, -_half, 0, -1, 0, 0, 0, 0,// Vertex 13
            _half, -_half, _half, 0, -1, 0, 0, 1, 0,// Vertex 14
            -_half, -_half, _half, 0, -1, 0, 1, 0, 0,// Vertex 15

            // Right face
            _half, -_half, -_half, 1, 0, 0, 0, 0, 0,// Vertex 16
            _half, _half, -_half, 1, 0, 0, 1, 1, 1,// Vertex 17
            _half, _half, _half, 1, 0, 0, 0, 0, 1,// Vertex 18
            _half, -_half, _half, 1, 0, 0, 0, 1, 0,// Vertex 19

            // Left face
            -_half, -_half, -_half, -1, 0, 0, 1, 0, 1,// Vertex 20
            -_half, -_half, _half, -1, 0, 0, 1, 0, 0,// Vertex 21
            -_half, _half, _half, -1, 0, 0, 1, 1, 0,// Vertex 22
            -_half, _half, -_half, -1, 0, 0, 0, 1, 1,// Vertex 23
        ]);


        //CG.log(vertices);
        const indices = new Uint16Array([
            0, 1, 2, 0, 2, 3,  // Front
            4, 5, 6, 4, 6, 7,  // Back
            8, 9, 10, 8, 10, 11, // Top
            12, 13, 14, 12, 14, 15, // Bottom
            16, 17, 18, 16, 18, 19, // Right
            20, 21, 22, 20, 22, 23, // Left
        ]);

        return new Geometry(vertices, indices)
            .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, glC.FLOAT, false, 36, 0)
            .setAttributeLayout(Geometry.ATTRIB_NORMAL, 3, glC.FLOAT, false, 36, 12)
            .setAttributeLayout(Geometry.ATTRIB_COLOR, 3, glC.FLOAT, false, 36, 24)
            .setDrawElementsParameters(glC.TRIANGLES, indices.length, glC.UNSIGNED_SHORT, 0)

    },

    createTriangle: (scale: number = 1): IGeometry => {
        const vertices = [
            0, 0.7 * scale, 0, -0.7 * scale,
            -0.3 * scale, 0, 0.7 * scale,
            -0.3 * scale, 0];

        return new Geometry(new Float32Array(vertices))
            .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, glC.FLOAT, false, 0, 0)
            .setDrawArraysParameters(glC.TRIANGLES, 0, vertices.length);
    },

    createGridPlane: (quaterSize: number, step = 1): IGeometry => {
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

        return new Geometry(new Float32Array(vertices))
            .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, glC.FLOAT, false, 0, 0)
            .setDrawArraysParameters(glC.LINES, 0, vertices.length);
    },

    createPlane: (width: number, height: number): IGeometry => {
        width *= .5;
        height *= .5;
        const vertices = new Float32Array([
            width, height, 0,
            0.0, 0.0,
            0, 0, 1,
            -width, height, 0,
            1.0, 0.0,
            0, 0, 1,
            -width, -height, 0,
            1.0, 1.0,
            0, 0, 1,
            width, -height, 0,
            0.0, 1.0,
            0, 0, 1,
        ]);
        const indices = new Uint16Array([
            0, 1, 2,
            2, 3, 0
        ]);
        return new Geometry(vertices, indices)
            .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, glC.FLOAT, false, 32, 0)
            .setAttributeLayout(Geometry.ATTRIB_TEXTURE_UV, 2, glC.FLOAT, false, 32, 12)
            .setAttributeLayout(Geometry.ATTRIB_NORMAL, 3, glC.FLOAT, false, 32, 20)
            .setDrawElementsParameters(glC.TRIANGLES, indices.length, glC.UNSIGNED_SHORT, 0)
    },

    createFrontQuad: (): IGeometry => {
        const vertices = new Float32Array([
            1, 1, 0,
            -1, 1, 0,
            -1, -1, 0,
            //
            -1, -1, 0,
            1, -1, 0,
            1, 1, 0,
        ]);
        return new Geometry(vertices)
            .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, glC.FLOAT, false, 0, 0)
            .setDrawArraysParameters(glC.TRIANGLES, 0, vertices.length);
    }
}

/**
* Geometry is a mathmatical shape, shared with man meshes.
*
* position attribute must use FLOAT;
* normal attribute must use FLOAT;
* color attribute must use FLOAT, should be clamped to [0, 1];
* index must use UNSIGNED_SHORT;
*
*/
export default class Geometry implements IGeometry {
    static ATTRIB_POSITION = 0;
    static ATTRIB_TEXTURE_UV = 1;
    static ATTRIB_NORMAL = 2;
    static ATTRIB_COLOR = 3;
    static ATTRIB_INSTANCED_MATRIX_COL_1 = 4;
    static ATTRIB_INSTANCED_MATRIX_COL_2 = 5;
    static ATTRIB_INSTANCED_MATRIX_COL_3 = 6;
    static ATTRIB_INSTANCED_MATRIX_COL_4 = 7;

    static DRAW_VERTEX: drawType = 1;
    static DRAW_VERTEX_INSTANCED: drawType = 2;
    static DRAW_ELEMENT: drawType = 3;
    static DRAW_ELEMENT_INSTANCED: drawType = 4;

    private _inited = false;
    private _vertices: Float32Array;
    private _indices: Uint16Array;
    private _instancedMatrices: Float32Array;
    private _instancedMatricesUsage: GLenum;
    private _divisor: number = 1;
    private _glVAO: WebGLVertexArrayObject;
    private _glInstancedVertexBuffer: WebGLBuffer;
    private _glVertexBuffer: WebGLBuffer;
    private _glIndexBuffer: WebGLBuffer;
    private _attributeLayouts: Array<BufferDescriptor> = [];
    private _vertexBufferLength = -1;
    private _indexBufferLength = -1;
    private _gl: WebGL2RenderingContext;
    private _drawCMD: () => void;
    private _drawParameter: DrawArraysParameter | DrawElementsParameter | DrawArraysInstancedParameter;

    constructor(vertices: Float32Array, indices?: Uint16Array) {
        this._vertices = vertices;
        this._indices = indices;
    }
    get criticalKey(): object { return Geometry; }

    get vertexBufferLength(): number {
        return this._vertexBufferLength;
    }

    get indexBufferLength(): number {
        return this._indexBufferLength;
    }

    get drawCMD(): () => void {
        return this._drawCMD;
    }

    bind(): void {
        this._gl.bindVertexArray(this._glVAO);
    }

    updateInstancedData(): IGeometry {
        const gl = this._gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._glInstancedVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._instancedMatrices, this._instancedMatricesUsage);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return this;
    }

    appendInstancedData(data: Float32Array, divisor: number, usage: GLenum = glC.STATIC_DRAW): IGeometry {
        this._instancedMatrices = data;
        this._divisor = divisor;
        this._instancedMatricesUsage = usage;
        return this;
    }

    /**
    * create gl buffers and record to VAO.
    */
    init(gl: WebGL2RenderingContext, usage: GLenum = glC.STATIC_DRAW): IGeometry {
        if (this._inited) {
            log.warn("[geometry] this instance have already been initiated.");
            return this;
        }
        this._gl = gl;

        this._glVAO = gl.createVertexArray();
        gl.bindVertexArray(this._glVAO);

        if (this._vertices && !this._glVertexBuffer) {
            this._glVertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this._glVertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this._vertices, usage);
            this._vertexBufferLength = this._vertices.length;

            this._attributeLayouts.forEach((v, i) => {
                if (v) {
                    gl.enableVertexAttribArray(i);
                    gl.vertexAttribPointer(i, v.size, v.type, v.normalized, v.stride, v.offset);
                }
            });
        }

        if (this._indices && !this._glIndexBuffer) {
            this._glIndexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._glIndexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this._indices, usage);
            this._indexBufferLength = this._indices.length;
        }

        if (this._instancedMatrices && !this._glInstancedVertexBuffer) {
            this._glInstancedVertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this._glInstancedVertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this._instancedMatrices, this._instancedMatricesUsage);
            for (let i = 0; i < 4; ++i) {
                gl.enableVertexAttribArray(Geometry.ATTRIB_INSTANCED_MATRIX_COL_1 + i);
                gl.vertexAttribPointer(Geometry.ATTRIB_INSTANCED_MATRIX_COL_1 + i, 4, glC.FLOAT, false, 64, 16 * i);
                gl.vertexAttribDivisor(Geometry.ATTRIB_INSTANCED_MATRIX_COL_1 + i, this._divisor); // Advance per instance
            }
        }

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        this._indices = this._vertices = undefined;

        this.bindDrawCMD();

        this._inited = true;
        return this;
    }

    setAttributeLayout(attributeName: number, size: GLint, type: GLenum, normalized: GLboolean, stride: GLsizei, offset: GLintptr): IGeometry {
        this._attributeLayouts[attributeName] = { size, type, normalized, stride, offset };
        return this;
    }

    setDrawArraysParameters(mode: GLenum, first: GLint, count: GLsizei): IGeometry {
        this._drawParameter = { method: Geometry.DRAW_VERTEX, mode, first, count };
        return this;
    }
    setDrawArraysInstancedParameters(mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei): IGeometry {
        this._drawParameter = { method: Geometry.DRAW_VERTEX_INSTANCED, mode, first, count, instanceCount };
        return this;
    }
    setDrawElementsParameters(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr): IGeometry {
        this._drawParameter = { method: Geometry.DRAW_ELEMENT, mode, count, type, offset };
        return this;
    }
    bindDrawCMD(): IGeometry {
        const gl = this._gl;
        if (!gl) {
            log.warn("[Geometry] call ::init() before this.");
            return this;
        }
        if (this._drawParameter.method === Geometry.DRAW_VERTEX) {
            this._drawCMD = gl.drawArrays.bind(gl,
                (this._drawParameter as DrawArraysParameter).mode,
                (this._drawParameter as DrawArraysParameter).first,
                (this._drawParameter as DrawArraysParameter).count
            );
        } else if (this._drawParameter.method === Geometry.DRAW_ELEMENT) {
            this._drawCMD = gl.drawElements.bind(gl,
                (this._drawParameter as DrawElementsParameter).mode,
                (this._drawParameter as DrawElementsParameter).count,
                (this._drawParameter as DrawElementsParameter).type,
                (this._drawParameter as DrawElementsParameter).offset
            );
        } else if (this._drawParameter.method === Geometry.DRAW_VERTEX_INSTANCED) {
            this._drawCMD = gl.drawArraysInstanced.bind(gl,
                (this._drawParameter as DrawArraysInstancedParameter).mode,
                (this._drawParameter as DrawArraysInstancedParameter).first,
                (this._drawParameter as DrawArraysInstancedParameter).count,
                (this._drawParameter as DrawArraysInstancedParameter).instanceCount
            );
        } else if (this._drawParameter.method === Geometry.DRAW_ELEMENT_INSTANCED) {
            //todo:
        }

        return this;
    }

    destroyGLObjects(gl: any) {
        if (this._inited) {
            if (!!this._glVertexBuffer) gl.deleteBuffer(this._glVertexBuffer);
            if (!!this._glIndexBuffer) gl.deleteBuffer(this._glIndexBuffer);
            if (!!this._glInstancedVertexBuffer) gl.deleteBuffer(this._glInstancedVertexBuffer);
            if (!!this._glVAO) gl.deleteVertexArray(this._glVAO);
            this._glIndexBuffer = this._glIndexBuffer = this._glInstancedVertexBuffer = this._glVAO = undefined;
            this._attributeLayouts.length = 0;
        }
        this._inited = false;
        return this;
    }
}

