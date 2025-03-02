#version 300 es
precision mediump float;

uniform mat4 u_mvpMatrix;

layout(location = 0) in vec3 a_position;
layout(location = 3) in vec3 a_color;
out vec3 v_color;

void main() {
  v_color = a_color;
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}
