#version 300 es
precision mediump float;
#define SHADER_NAME pbr
//%%
layout(std140) uniform u_ub_camera {
    mat4 u_vInvMatrix;
    mat4 u_vMatrix;
    mat4 u_pMatrix;
    mat4 u_pInvMatrix;
    mat4 u_vpMatrix;
};

layout(std140) uniform u_ub_light {
    mat4 u_lInvMatrix;
    mat4 u_lMatrix;
    mat4 u_lpMatrix;
    vec4 u_lightColor;  // w: intensity;
};
uniform mat4 u_mMatrix;
uniform mat4 u_mMatrix_dir;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec4 a_tangent;
layout(location = 3) in vec3 a_color;
layout(location = 5) in vec2 a_uvCoord_0;
layout(location = 6) in vec2 a_uvCoord_1;
layout(location = 7) in vec2 a_uvCoord_2;
layout(location = 8) in vec2 a_uvCoord_3;
layout(location = 9) in vec2 a_uvCoord_4;

out vec3 v_positionW;
out vec3 v_normalW;
out vec3 v_normal;
out vec3 v_tangentW;
out vec2 v_arrayUV[5];
out vec3 v_color;
out vec4 v_positionLProj;

void main() {
    vec4 _pos = vec4(a_position, 1.0);
    vec4 _posW = u_mMatrix * _pos;
    gl_Position = u_vpMatrix * _posW;

    v_color = a_color;
    v_normal = a_normal;
    v_positionW = _posW.xyz;
    v_normalW = (u_mMatrix_dir * vec4(a_normal, 0.0)).xyz;
    v_tangentW = (u_mMatrix_dir * vec4(a_tangent.xyz, 0.0)).xyz;
    v_arrayUV[0] = a_uvCoord_0;
    v_arrayUV[1] = a_uvCoord_1;
    v_arrayUV[2] = a_uvCoord_2;
    v_arrayUV[3] = a_uvCoord_3;
    v_arrayUV[4] = a_uvCoord_4;

#ifdef FT_SHADOW
    v_positionLProj = u_lpMatrix * _posW;
#endif
}
