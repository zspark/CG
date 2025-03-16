type _glConst = {
    STATIC_DRAW: GLenum,
    DYNAMIC_DRAW: GLenum,

    ARRAY_BUFFER: GLenum,
    ELEMENT_ARRAY_BUFFER: GLenum,
    FLOAT: GLenum,
    UNSIGNED_SHORT: GLenum;
    UNSIGNED_BYTE: GLenum,
    UNSIGNED_INT: GLenum,

    FRAMEBUFFER: GLenum,
    FRAMEBUFFER_COMPLETE: GLenum,

    BACK: GLenum,
    FRONT: GLenum,
    NONE: GLenum,

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

    RGBA: GLenum,

    TEXTURE_WRAP_R: GLenum,
    TEXTURE_WRAP_S: GLenum,
    TEXTURE_WRAP_T: GLenum,
    TEXTURE_MIN_FILTER: GLenum,
    TEXTURE_MAG_FILTER: GLenum,
    TEXTURE_COMPARE_MODE: GLenum,
    COMPARE_REF_TO_TEXTURE: GLenum,
    TEXTURE_COMPARE_FUNC: GLenum,
    LEQUAL: GLenum,
    CLAMP_TO_EDGE: GLenum,
    NEAREST: GLenum,
    LINEAR: GLenum,

    DEPTH_COMPONENT16: GLenum,
    DEPTH_COMPONENT: GLenum,
    R32I: GLenum,
    RED_INTEGER: GLenum,
    INT: GLenum,
    R32F: GLenum,
    RED: GLenum,


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
    glConst.RGBA = gl.RGBA;
    glConst.UNSIGNED_BYTE = gl.UNSIGNED_BYTE;
    glConst.UNSIGNED_INT = gl.UNSIGNED_INT;

    glConst.TEXTURE_WRAP_R = gl.TEXTURE_WRAP_R;
    glConst.TEXTURE_WRAP_S = gl.TEXTURE_WRAP_S;
    glConst.TEXTURE_WRAP_T = gl.TEXTURE_WRAP_T;
    glConst.TEXTURE_MIN_FILTER = gl.TEXTURE_MIN_FILTER;
    glConst.TEXTURE_MAG_FILTER = gl.TEXTURE_MAG_FILTER;
    glConst.CLAMP_TO_EDGE = gl.CLAMP_TO_EDGE;
    glConst.NEAREST = gl.NEAREST;
    glConst.LINEAR = gl.LINEAR;
    glConst.TEXTURE_COMPARE_MODE = gl.TEXTURE_COMPARE_MODE;
    glConst.COMPARE_REF_TO_TEXTURE = gl.COMPARE_REF_TO_TEXTURE;
    glConst.TEXTURE_COMPARE_FUNC = gl.TEXTURE_COMPARE_FUNC;
    glConst.LEQUAL = gl.LEQUAL;
    glConst.LESS = gl.LESS;

    glConst.DEPTH_COMPONENT16 = gl.DEPTH_COMPONENT16;
    glConst.DEPTH_COMPONENT = gl.DEPTH_COMPONENT;
    glConst.R32I = gl.R32I;
    glConst.R32F = gl.R32F;
    glConst.RED = gl.RED;
    glConst.RED_INTEGER = gl.RED_INTEGER;
    glConst.INT = gl.INT;

    glConst.NONE = gl.NONE;
}

export default glConst;

export const BINDING_POINT = {
    UBO_BINDING_POINT_CAMERA: 0,
    UBO_BINDING_POINT_LIGHT: 1,
}

