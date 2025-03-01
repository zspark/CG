#version 300 es
precision mediump float;

uniform sampler2D u_shadowMap;
uniform vec3 u_color;

in vec4 v_positionLProj;
in vec4 v_normalL;
out vec4 fragColor;

/*
const float near_plane = 1.0f;
const float far_plane = 100.0f;
float _linearizeDepth(float depth) {
  float z = depth * 2.0 - 1.0; // Back to NDC
  return (2.0 * near_plane * far_plane) /
         (far_plane + near_plane - z * (far_plane - near_plane));
}
*/

void main() {
  vec3 _projCoord = v_positionLProj.xyz / v_positionLProj.w;
  _projCoord = _projCoord * .5 + .5;

  float _depth = texture(u_shadowMap, _projCoord.xy).r;
  float _bias = sign(v_normalL.z) * 0.0001;
  float _factor = (_projCoord.z - _bias) > _depth ? 0.4 : 1.0;
  fragColor = vec4(u_color * _factor, 1.0);
}
