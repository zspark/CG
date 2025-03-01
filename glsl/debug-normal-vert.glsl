#version 300 es

uniform mat4 u_mvpMatrix;
uniform mat4 u_debugNormalModelMatrix; // model to world;
uniform mat4 u_debugNormalViewMatrix;  // world to view;
uniform int u_debugNormalSpace; // 0:model space; 1:world space; 2:view space;

layout(location = 0) in vec3 a_position;
layout(location = 2) in vec3 a_normal;

out vec3 v_normal;

void main() { //
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
  if (u_debugNormalSpace == 0) {
    v_normal = a_normal;
  } else if (u_debugNormalSpace == 1) {
    v_normal = (u_debugNormalModelMatrix * vec4(a_normal, .0)).xyz;
  } else if (u_debugNormalSpace == 2) {
    v_normal = (u_debugNormalViewMatrix * u_debugNormalModelMatrix *
                vec4(a_normal, .0))
                   .xyz;
  }
}
