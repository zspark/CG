type _glConst = {
    STATIC_DRAW: GLenum,
    DYNAMIC_DRAW: GLenum,

    ARRAY_BUFFER: GLenum,
    ELEMENT_ARRAY_BUFFER: GLenum,
    FLOAT: GLenum,
    UNSIGNED_SHORT: GLenum;

    FRAMEBUFFER: GLenum,
    FRAMEBUFFER_COMPLETE: GLenum,

    BACK: GLenum,
    FRONT: GLenum,

    LINES: GLenum,
    TRIANGLES: GLenum,

    DEPTH_TEST: GLenum,
    DEPTH_FUNC: GLenum,
    DEPTH: GLenum,
    LESS: GLenum,

    BLEND: GLenum,
    SRC_ALPHA: GLenum,
    ONE_MINUS_SRC_ALPHA: GLenum,
    FUNC_ADD: GLenum,

    CULL_FACE: GLenum,
    CULL_FACE_MODE: GLenum,
}

//@ts-ignore
let glConst: _glConst = {};
export function initGLConstant(gl: WebGL2RenderingContext): void {
    glConst.BACK = gl.BACK;
    glConst.FRONT = gl.FRONT;
    glConst.LINES = gl.LINES;
    glConst.TRIANGLES = gl.TRIANGLES;
    glConst.DEPTH_TEST = gl.DEPTH_TEST;
    glConst.DEPTH_FUNC = gl.DEPTH_FUNC;
    glConst.DEPTH = gl.DEPTH;
    glConst.BLEND = gl.BLEND;
    glConst.FUNC_ADD = gl.FUNC_ADD;
    glConst.SRC_ALPHA = gl.SRC_ALPHA;
    glConst.ONE_MINUS_SRC_ALPHA = gl.ONE_MINUS_SRC_ALPHA;
    glConst.CULL_FACE = gl.CULL_FACE;
    glConst.CULL_FACE_MODE = gl.CULL_FACE_MODE;
    glConst.FRAMEBUFFER = gl.FRAMEBUFFER;
    glConst.FRAMEBUFFER_COMPLETE = gl.FRAMEBUFFER_COMPLETE;
    glConst.FLOAT = gl.FLOAT;
    glConst.UNSIGNED_SHORT = gl.UNSIGNED_SHORT;
    glConst.ARRAY_BUFFER = gl.ARRAY_BUFFER;
    glConst.ELEMENT_ARRAY_BUFFER = gl.ELEMENT_ARRAY_BUFFER;
    glConst.STATIC_DRAW = gl.STATIC_DRAW;
    glConst.DYNAMIC_DRAW = gl.DYNAMIC_DRAW;
    glConst.LESS = gl.LESS;

}

export default glConst;

