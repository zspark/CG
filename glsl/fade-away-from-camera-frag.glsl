#version 300 es
precision mediump float;

const float FADE_DISTANCE_BEGIN = 10.0;
const float FADE_DISTANCE_END = 30.0;
const float GRID_COLOR = 0.55;

in float v_distanceToCamera;
out vec4 fragColor;

void main() {
  float alpha = 1.0 - smoothstep(FADE_DISTANCE_BEGIN, FADE_DISTANCE_END,
                                 v_distanceToCamera);
  alpha = clamp(alpha, 0.0, 1.0);
  fragColor = vec4(GRID_COLOR, GRID_COLOR, GRID_COLOR, alpha);
  // fragColor = vec4(1.0,0.0,0.0,1.0);
}
