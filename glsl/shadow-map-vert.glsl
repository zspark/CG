#version 300 es

uniform mat4 u_mvpMatrix;
uniform mat4 u_mlpMatrix;
uniform mat4 u_mlMatrix;
uniform mat4 u_mlMatrix_normal;

layout(location = 0) in vec3 a_position;
layout(location = 2) in vec3 a_normal;
out vec4 v_positionLProj;
out vec4 v_positionL;
out vec4 v_normalL;

void main() {
  vec4 _pos = vec4(a_position, 1.0);
  gl_Position = u_mvpMatrix * _pos;
  v_positionLProj = u_mlpMatrix * _pos;
  v_positionL = u_mlMatrix * _pos;
  v_normalL = u_mlMatrix_normal * vec4(a_normal, 0.0);
}
