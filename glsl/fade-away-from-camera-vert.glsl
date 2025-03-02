#version 300 es
precision mediump float;

uniform mat4 u_mvpMatrix;
uniform mat4 u_mvMatrix;

layout(location = 0) in vec3 a_position;
out float v_distanceToCamera;

void main() {
  vec4 pos = vec4(a_position, 1.0);
  gl_Position = u_mvpMatrix * pos;
  v_distanceToCamera = -(u_mvMatrix * pos).z;
}
