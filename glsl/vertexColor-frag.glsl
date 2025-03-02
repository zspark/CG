#version 300 es
precision mediump float;

// const float gammaFactor = (1.0/2.2);
// const float gammaFactor = 2.2;

in vec3 v_color;
out vec4 fragColor;

void main() {
  // fragColor = pow(vec4( v_color, 1.0), vec4(gammaFactor));
  fragColor = vec4(v_color, 1.0);
  // fragColor = vec4(1.0,0.0,0.0,1.0);
}
