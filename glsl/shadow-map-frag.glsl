#version 300 es
precision mediump float;

uniform sampler2D u_shadowMap;
uniform vec3 u_color;
uniform vec2 u_nearFarPlane;

in vec4 v_positionLProj;
in vec4 v_positionL;
in vec4 v_normalL;
out vec4 fragColor;

/**
 * map depth from (0-1) to (near - far), all positive valus
 */
float _linearizeDepth(float depth) {
  float z = depth * 2.0 - 1.0; // Back to NDC
  return (2.0 * u_nearFarPlane.x * u_nearFarPlane.y) /
         (u_nearFarPlane.y + u_nearFarPlane.x -
          z * (u_nearFarPlane.y - u_nearFarPlane.x));
}
/*
 */

void main() {
  vec3 _projCoord = v_positionLProj.xyz / v_positionLProj.w;
  _projCoord = _projCoord * .5 + .5;
  float _depth = texture(u_shadowMap, _projCoord.xy).r;
  float _depthLinear = _linearizeDepth(_depth);

  float _dot = dot(normalize(v_positionL.xyz), normalize(v_normalL.xyz));
  float _bias = min(0.1, max(0.03, (1.0 - abs(_dot))));
  _bias *= sign(_dot);

  float _factor = (-v_positionL.z + _bias) > _depthLinear ? 0.4 : 1.0;
  fragColor = vec4(u_color * _factor, 1.0);
}
