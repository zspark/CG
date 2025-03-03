#version 300 es
precision mediump float;

uniform float u_edgeThrottle;
uniform sampler2D u_depthTexture_r32f;

out vec4 fragColor;

void main() { //

  vec2 _textureSize =
      vec2(textureSize(u_depthTexture_r32f, 0)); // 0 means lod level;
  vec2 _texelSize = 1.0 / _textureSize;

  float _depth[9];
  int _index = 0;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      _depth[_index] = texture(u_depthTexture_r32f,
                               (gl_FragCoord.xy + vec2(i, j)) * _texelSize)
                           .r;
      ++_index;
    }
  }

  // Sobel kernel. and strength.
  /*
vertical direction:
-1  0  1
-2  0  2
-1  0  1

horizontal direction:
-1 -2 -1
0  0  0
1  2  1
  */
  float _gradiantX = (-1.0 * _depth[0]) + (1.0 * _depth[2]) +
                     (-2.0 * _depth[3]) + (2.0 * _depth[5]) +
                     (-1.0 * _depth[6]) + (1.0 * _depth[8]);
  float _gradianY = (-1.0 * _depth[0]) + (-2.0 * _depth[1]) +
                    (-1.0 * _depth[2]) + (1.00 * _depth[6]) +
                    (2.0 * _depth[7]) + (1.0 * _depth[8]);
  float _edgeStrength = length(vec2(_gradiantX, _gradianY));

  if (step(u_edgeThrottle, _edgeStrength) > 0.5) {
    fragColor = vec4(1.0, 1.0, 0.0, 1.0);
  } else
    discard;
}
