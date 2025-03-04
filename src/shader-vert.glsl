#version 300 es
precision mediump float;

//%%

#ifndef POSITION_PASS_THROUGH

    #ifdef INSTANCED_MATRIX
uniform mat4 u_vpMatrix;
layout(location = 4) in vec4 a_instanceMatrix_col0;
layout(location = 5) in vec4 a_instanceMatrix_col1;
layout(location = 6) in vec4 a_instanceMatrix_col2;
layout(location = 7) in vec4 a_instanceMatrix_col3;
    #else
uniform mat4 u_mvpMatrix;
    #endif

    #ifdef FADE_AWAY_FROM_CAMERA
uniform mat4 u_mvMatrix;
out float v_distanceToCamera;
    #endif

    #ifdef COLOR_VERTEX_ATTRIB
layout(location = 3) in vec3 a_color;
out vec3 v_color;
    #endif

#endif

layout(location = 0) in vec3 a_position;

void main() {
    vec4 pos = vec4(a_position, 1.0);

#ifdef POSITION_PASS_THROUGH
    gl_Position = pos;
#else

    #ifdef FADE_AWAY_FROM_CAMERA
    v_distanceToCamera = -(u_mvMatrix * pos).z;
    #endif

    #ifdef COLOR_VERTEX_ATTRIB
    v_color = a_color;
    #endif

    #ifdef INSTANCED_MATRIX
    mat4 _instanceMatrix = mat4(a_instanceMatrix_col0, a_instanceMatrix_col1,
                                a_instanceMatrix_col2, a_instanceMatrix_col3);
    gl_Position = u_vpMatrix * _instanceMatrix * pos;
    #else
    gl_Position = u_mvpMatrix * pos;
    #endif

#endif
}
