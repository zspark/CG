#version 300 es

uniform mat4 u_mvpMatrix;

layout(location = 0) in vec3 a_position;

void main() { //
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}
