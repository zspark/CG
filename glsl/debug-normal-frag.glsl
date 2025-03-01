#version 300 es
precision mediump float;

in vec3 v_normal;
out vec4 fragColor;

void main() { //
  vec3 normal = normalize(v_normal) * .5 + .5;
  fragColor = vec4(normal, 1.0);
}
