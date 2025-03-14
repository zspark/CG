#version 300 es
precision mediump float;

//%%

layout(std140) uniform u_ub_camera {
    mat4 u_vInvMatrix;
    mat4 u_vMatrix;
    mat4 u_pMatrix;
    mat4 u_pInvMatrix;
    mat4 u_vpMatrix;
};
uniform mat4 u_mMatrix;
uniform mat4 u_mMatrix_dir;
uniform mat4 u_debugNormalModelMatrix;  // model to world;
uniform mat4 u_debugNormalViewMatrix;   // world to view;
uniform int u_debugNormalSpace;         // 0:model space; 1:world space; 2:view space;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_uvCoord;
layout(location = 2) in vec3 a_normal;
layout(location = 3) in vec3 a_color;
layout(location = 12) in vec4 a_instanceMatrix_col0;
layout(location = 13) in vec4 a_instanceMatrix_col1;
layout(location = 14) in vec4 a_instanceMatrix_col2;
layout(location = 15) in vec4 a_instanceMatrix_col3;

out float v_distanceToCamera;
out vec3 v_positionW;
out vec3 v_normalW;
out vec3 v_color;
out vec3 v_normal_debug;
out vec3 v_rayDirection;

void main() {
    vec4 pos = vec4(a_position, 1.0);

#ifdef DEBUG_NORMAL
    if (u_debugNormalSpace == 0) {
        v_normal_debug = a_normal;
    } else if (u_debugNormalSpace == 1) {
        v_normal_debug = (u_debugNormalModelMatrix * vec4(a_normal, .0)).xyz;
    } else if (u_debugNormalSpace == 2) {
        v_normal_debug = (u_debugNormalViewMatrix * u_debugNormalModelMatrix * vec4(a_normal, .0)).xyz;
    }
#endif

#ifdef POSITION_IN_NDC
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
    v_distanceToCamera = -(u_vMatrix * u_mMatrix * pos).z;
    #endif

    #ifdef COLOR_VERTEX_ATTRIB
    v_color = a_color;
    #endif

    #ifdef INSTANCED_MATRIX
    mat4 _instanceMatrix = mat4(
        a_instanceMatrix_col0, a_instanceMatrix_col1,
        a_instanceMatrix_col2, a_instanceMatrix_col3);
    gl_Position = u_vpMatrix * _instanceMatrix * pos;
    #else
    gl_Position = u_vpMatrix * u_mMatrix * pos;
    #endif

    #ifdef PHONG
    v_positionW = (u_mMatrix * pos).xyz;
    v_normalW = (u_mMatrix_dir * vec4(a_normal, 0.0)).xyz;
    #endif

#endif
}
