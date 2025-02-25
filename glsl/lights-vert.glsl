#version 300 es

uniform mat4 u_mvpMatrix;
uniform mat4 u_mMatrix;

layout(location = 0) in vec3 a_position;
layout(location = 2) in vec3 a_normal;
out vec3 v_positionW;
out vec3 v_normalW;

void main() {
  vec4 _pos = vec4(a_position, 1.0);
  gl_Position = u_mvpMatrix * _pos;

  v_positionW = (u_mMatrix * _pos).xyz;
  v_normalW = (u_mMatrix * vec4(a_normal, 0.0)).xyz;
}
