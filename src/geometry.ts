import log from "./log.js";
import glC from "./gl-const.js";
import { ShaderLocation_e, IGeometry, StepMode_e, IBuffer, IBindableObject } from "./types-interfaces.js";
import { Buffer } from "./device-resource.js";

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


export const geometry: {
    createAxes: (length: number) => IGeometry,
    createCube: (length: number) => IGeometry,
    createPlane: (width: number, height: number) => IGeometry,
    createGridPlane: (length: number) => IGeometry,
    createFrontQuad: () => IGeometry,
    createTriangle: (scale: number) => IGeometry,
} = {
    createAxes: (length: number = 1): IGeometry => {
        const vertices = new Float32Array([
            0, 0, 0,/*color*/ 1, 0.2, 0.2,/**/ length, 0, 0,/*color*/ 1, 0, 0, // x;
            0, 0, 0,/*color*/ 0.2, 1, 0.2,/**/ 0, length, 0,/*color*/ 0, 1, 0, // x;
            0, 0, 0,/*color*/ 0.2, 0.2, 1,/**/ 0, 0, length,/*color*/ 0, 0, 1, // x;
        ]);
        return new Geometry()
            .addVertexBuffer(new Buffer()
                .setData(vertices)
                .setStrideAndStepMode(24, StepMode_e.vertex)
                .setAttribute(ShaderLocation_e.ATTRIB_POSITION, 3, glC.FLOAT, false, 0)
                .setAttribute(ShaderLocation_e.ATTRIB_COLOR, 3, glC.FLOAT, false, 12)
            )
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

        return new Geometry()
            .addVertexBuffer(new Buffer()
                .setData(vertices)
                .setStrideAndStepMode(36, StepMode_e.vertex)
                .setAttribute(ShaderLocation_e.ATTRIB_POSITION, 3, glC.FLOAT, false, 0)
                .setAttribute(ShaderLocation_e.ATTRIB_NORMAL, 3, glC.FLOAT, false, 12)
                .setAttribute(ShaderLocation_e.ATTRIB_COLOR, 3, glC.FLOAT, false, 24)
            )
            .setIndexBuffer(new Buffer(glC.ELEMENT_ARRAY_BUFFER)
                .setData(indices)
            )
            .setDrawElementsParameters(glC.TRIANGLES, indices.length, glC.UNSIGNED_SHORT, 0)

    },

    createTriangle: (scale: number = 1): IGeometry => {
        const vertices = [
            0, 0.7 * scale, 0, -0.7 * scale,
            -0.3 * scale, 0, 0.7 * scale,
            -0.3 * scale, 0];

        return new Geometry()
            .addVertexBuffer(new Buffer()
                .setData(new Float32Array(vertices))
                .setStrideAndStepMode(0, StepMode_e.vertex)
                .setAttribute(ShaderLocation_e.ATTRIB_POSITION, 3, glC.FLOAT, false, 0)
            )
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

        return new Geometry()
            .addVertexBuffer(new Buffer()
                .setData(new Float32Array(vertices))
                .setStrideAndStepMode(0, StepMode_e.vertex)
                .setAttribute(ShaderLocation_e.ATTRIB_POSITION, 3, glC.FLOAT, false, 0)
            )
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
        return new Geometry()
            .addVertexBuffer(new Buffer()
                .setData(vertices)
                .setStrideAndStepMode(32, StepMode_e.vertex)
                .setAttribute(ShaderLocation_e.ATTRIB_POSITION, 3, glC.FLOAT, false, 0)
                .setAttribute(ShaderLocation_e.ATTRIB_TEXTURE_UV, 2, glC.FLOAT, false, 12)
                .setAttribute(ShaderLocation_e.ATTRIB_NORMAL, 3, glC.FLOAT, false, 20)
            )
            .setIndexBuffer(new Buffer(glC.ELEMENT_ARRAY_BUFFER)
                .setData(indices)
            )
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
        return new Geometry()
            .addVertexBuffer(new Buffer()
                .setData(vertices)
                .setStrideAndStepMode(0, StepMode_e.vertex)
                .setAttribute(ShaderLocation_e.ATTRIB_POSITION, 3, glC.FLOAT, false, 0)
            )
            .setDrawArraysParameters(glC.TRIANGLES, 0, vertices.length)
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
    static DRAW_VERTEX: drawType = 1;
    static DRAW_VERTEX_INSTANCED: drawType = 2;
    static DRAW_ELEMENT: drawType = 3;
    static DRAW_ELEMENT_INSTANCED: drawType = 4;

    private _inited = false;
    private _glVAO: WebGLVertexArrayObject;
    private _arrBuffer: IBuffer[] = [];
    private _gl: WebGL2RenderingContext;
    private _drawCMD: () => void;
    private _drawParameter: DrawArraysParameter | DrawElementsParameter | DrawArraysInstancedParameter;
    private _vertexBufferLength = -1;
    private _indexBufferLength = -1;
    private _indexBuffer: IBuffer;

    constructor() { }

    get criticalKey(): object { return Geometry; }
    get vertexBufferLength(): number { return this._vertexBufferLength; }
    get indexBufferLength(): number { return this._indexBufferLength; }
    get drawCMD(): () => void { return this._drawCMD; }

    bind(): void {
        this._gl.bindVertexArray(this._glVAO);
    }

    addVertexBuffer(buffer: IBuffer): IGeometry {
        this._vertexBufferLength = buffer.length;
        this._arrBuffer.push(buffer);
        return this;
    }

    setIndexBuffer(buffer: IBuffer): IGeometry {
        this._indexBufferLength = buffer.length;
        this._indexBuffer = buffer;
        return this;
    }

    createGPUResource(gl: WebGL2RenderingContext, createBufferGPUResourceAsWell: boolean = false): IGeometry {
        if (this._inited) {
            log.warn("[geometry] this instance has already been initiated.");
            return this;
        }
        this._gl = gl;

        this._glVAO = gl.createVertexArray();
        gl.bindVertexArray(this._glVAO);
        this._arrBuffer.forEach(b => { (createBufferGPUResourceAsWell ? b.createGPUResource(gl) : b).bind(); });
        if (this._indexBuffer) {
            (createBufferGPUResourceAsWell ? this._indexBuffer.createGPUResource(gl) : this._indexBuffer).bind();
        }
        gl.bindVertexArray(null);

        this.bindDrawCMD();

        this._inited = true;
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
            this._indexBuffer?.destroyGPUResource();
            this._arrBuffer.forEach(b => { b.destroyGPUResource(); });
            this._arrBuffer.length = 0;
            if (!!this._glVAO) gl.deleteVertexArray(this._glVAO);
        }
        this._inited = false;
        return this;
    }
}

