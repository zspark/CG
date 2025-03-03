#version 300 es
precision mediump float;

uniform sampler2D u_texture;

out vec4 fragColor;

void main() { //
  vec2 _uv = vec2(gl_FragCoord.x / 640.0, gl_FragCoord.y / 480.0);
  fragColor = texture(u_texture, _uv);
}
