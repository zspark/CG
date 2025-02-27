import log from "./log.js";
import { BufferDescriptor } from "./gl.js";

type geometryInfo = {
    vertices: Float32Array;
    uvs?: Float32Array;
    normals?: Float32Array;
    colors?: Uint8Array;
    indices?: Uint16Array;
}

export interface IGeometry {
    vertexBufferLength: number;
    indexBufferLength: number;
    VAO: WebGLVertexArrayObject;

    /**
    * create gl buffers and record to VAO.
    */
    init(gl: WebGL2RenderingContext, usage?: number): IGeometry;

    setAttributeLayout(attributeName: number, size: number, type: number, normalized: boolean, stride: number, offset: number): IGeometry;

    destroyGLObjects(gl: WebGL2RenderingContext): IGeometry;
}

export function createCube(edgeLength: number): IGeometry {
    const _half = edgeLength * .5;
    const _n = 1.0 / Math.sqrt(3);
    const vertices = new Float32Array([
        -_half, -_half, _half, // 前下左 0
        -_n, -_n, _n,
        1, 0, 0,//0
        _half, -_half, _half, // 前下右 1
        _n, -_n, _n,
        0, 1, 0,//1
        _half, _half, _half, // 前上右 2
        _n, _n, _n,
        0, 0, 1,//2
        -_half, _half, _half, // 前上左 3
        -_n, _n, _n,
        1, 1, 1,//3
        -_half, -_half, -_half, // 后下左 4
        -_n, -_n, -_n,
        0, 0, 1,//4
        _half, -_half, -_half, // 后下右 5
        _n, -_n, -_n,
        1, 1, 1,//5
        _half, _half, -_half, // 后上右 6
        _n, _n, -_n,
        1, 0, 0,//6
        -_half, _half, -_half, // 后上左 7
        -_n, _n, -_n,
        0, 1, 0,//7
    ]);

    //CG.log(vertices);
    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3, // 前面
        1, 5, 6, 1, 6, 2, // 右面
        5, 4, 7, 5, 7, 6, // 后面
        4, 0, 3, 4, 3, 7, // 左面
        3, 2, 6, 3, 6, 7, // 上面
        0, 4, 5, 0, 5, 1, // 下面
    ]);

    return new Geometry(vertices, indices)
        .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, 5126, false, 36, 0)
        .setAttributeLayout(Geometry.ATTRIB_NORMAL, 3, 5126, false, 36, 12)
        .setAttributeLayout(Geometry.ATTRIB_COLOR, 3, 5126, false, 36, 24);

}

export function createTriangle(scale: number = 1): IGeometry {
    const vertices = [0, 0.7 * scale, 0, -0.7 * scale, -0.3 * scale, 0, 0.7 * scale, -0.3 * scale, 0];
    const indices = [0, 1, 2];

    return new Geometry(new Float32Array(vertices), new Uint16Array(indices))
        .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, 5126, false, 0, 0);
}

export function createGridPlane(quaterSize: number, step = 1): IGeometry {
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
        .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, 5126, false, 0, 0);
}

export function createPlane(width: number, height: number): IGeometry {
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
        .setAttributeLayout(Geometry.ATTRIB_POSITION, 3, 5126, false, 32, 0)
        .setAttributeLayout(Geometry.ATTRIB_TEXTURE_UV, 2, 5126, false, 32, 12)
        .setAttributeLayout(Geometry.ATTRIB_NORMAL, 3, 5126, false, 32, 20);
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
export default class Geometry implements IGeometry {
    /*
    static assembleFromGLTF(glftContent) :Geometry{
        CG.info("[geometry.js] need implementation.");
        //TODO:
    }
    */

    static ATTRIB_POSITION = 0;
    static ATTRIB_TEXTURE_UV = 1;
    static ATTRIB_NORMAL = 2;
    static ATTRIB_COLOR = 3;

    private _inited = false;
    private _vertices: Float32Array;
    private _indices: Uint16Array;
    private _glVAO: WebGLVertexArrayObject;
    private _glVertexBuffer: WebGLBuffer;
    private _glIndexBuffer: WebGLBuffer;
    private _attributeLayouts: Array<BufferDescriptor> = [];
    private _vertexBufferLength = -1;
    private _indexBufferLength = -1;

    constructor(vertices: Float32Array, indices?: Uint16Array) {
        this._vertices = vertices;
        this._indices = indices;
    }

    get vertexBufferLength(): number {
        return this._vertexBufferLength;
    }

    get indexBufferLength(): number {
        return this._indexBufferLength;
    }

    get VAO(): WebGLVertexArrayObject {
        return this._glVAO;
    }

    /**
    * create gl buffers and record to VAO.
    */
    init(gl: WebGL2RenderingContext, usage?: number): IGeometry {
        if (this._inited) return this;

        this._glVAO = gl.createVertexArray();
        gl.bindVertexArray(this._glVAO);

        usage ??= gl.STATIC_DRAW;
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
        gl.bindVertexArray(null);

        this._indices = this._vertices = undefined;
        this._inited = true;
        return this;
    }

    setAttributeLayout(attributeName: number, size: GLint, type: GLenum, normalized: GLboolean, stride: GLsizei, offset: GLintptr): IGeometry {
        this._attributeLayouts[attributeName] = { size, type, normalized, stride, offset };
        return this;
    }

    destroyGLObjects(gl: any) {
        if (!!this._glVertexBuffer) gl.deleteBuffer(this._glVertexBuffer);
        if (!!this._glIndexBuffer) gl.deleteBuffer(this._glIndexBuffer);
        this._attributeLayouts.length = 0;
        this._glIndexBuffer = this._glIndexBuffer = undefined;

        gl.deleteVertexArray(this._glVAO);
        this._glVAO = undefined;
        return this;
    }
}

