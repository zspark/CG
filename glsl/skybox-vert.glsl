#version 300 es

uniform mat4 u_mvpMatrix;

layout(location = 0) in vec3 a_position;
out vec3 v_uvSkybox;

void main() {
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
  v_uvSkybox = a_position;
}
