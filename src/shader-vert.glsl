#version 300 es
precision mediump float;

//%%

#ifdef POSITION_PASS_THROUGH
    #ifdef SKYBOX_LATLON
uniform mat4 u_pInvMatrix;
uniform mat4 u_vInvMatrix;
out vec3 v_rayDirection;
    #endif

#else
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

#ifdef NORMAL
uniform int u_debugNormalSpace;  // 0:model space; 1:world space; 2:view space;
uniform mat4 u_debugNormalModelMatrix;  // model to world;
uniform mat4 u_debugNormalViewMatrix;   // world to view;
layout(location = 2) in vec3 a_normal;
out vec3 v_normal;
#endif

void main() {
    vec4 pos = vec4(a_position, 1.0);

#ifdef NORMAL
    if (u_debugNormalSpace == 0) {
        v_normal = a_normal;
    } else if (u_debugNormalSpace == 1) {
        v_normal = (u_debugNormalModelMatrix * vec4(a_normal, .0)).xyz;
    } else if (u_debugNormalSpace == 2) {
        v_normal = (u_debugNormalViewMatrix * u_debugNormalModelMatrix *
                    vec4(a_normal, .0))
                       .xyz;
    }
#endif

#ifdef POSITION_PASS_THROUGH
    gl_Position = pos;

    #ifdef SKYBOX_LATLON
    vec4 viewPos = u_pInvMatrix * pos;
    viewPos /= viewPos.w;
    viewPos.w = 0.f;  // be careful direction transformation.
    vec4 worldPos = u_vInvMatrix * viewPos;
    v_rayDirection = worldPos.xyz;
    #endif
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
