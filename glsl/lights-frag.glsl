#version 300 es
precision mediump float;

const int LIGHT_TYPE_SPOINT = 1;
const int LIGHT_TYPE_PARALLEL = 2;
const int LIGHT_TYPE_SPOT = 3;

uniform int u_lightType;
uniform float u_lightAngle; // radian
uniform float u_lightCutoff;
uniform vec4 u_lightColor;
uniform vec3 u_lightPositionW;
uniform vec3 u_lightDirectionW;
uniform vec3 u_cameraPositionW;

in vec3 v_positionW;
in vec3 v_normalW;
out vec4 fragColor;

void main() {
  vec3 _normalW = normalize(v_normalW);
  vec3 _lightDirW;
  if (u_lightType == LIGHT_TYPE_SPOINT) {
    _lightDirW = normalize(u_lightPositionW - v_positionW);
    float _lDn = dot(_lightDirW, _normalW);
    if (_lDn <= 0.0) {
      fragColor = vec4(0.0);
    } else {
      fragColor = clamp(_lDn, 0.0, 1.0) * u_lightColor;
    }
  } else if (u_lightType == LIGHT_TYPE_PARALLEL) {
    _lightDirW = -u_lightDirectionW;
    float _lDn = dot(_lightDirW, _normalW);
    if (_lDn <= 0.0) {
      fragColor = vec4(0.0);
    } else {
      fragColor = clamp(_lDn, 0.0, 1.0) * u_lightColor;
    }
  } else if (u_lightType == LIGHT_TYPE_SPOT) {
    _lightDirW = u_lightPositionW - v_positionW;
    if (length(_lightDirW) > u_lightCutoff) {
      fragColor = vec4(0.0);
    } else {
      vec3 _lightDirW_ = normalize(_lightDirW);
      if (dot(-_lightDirW_, u_lightDirectionW) < cos(u_lightAngle)) {
        fragColor = vec4(0.0);
      } else {
        float _lDn = dot(_lightDirW_, _normalW);
        if (_lDn <= 0.0) {
          fragColor = vec4(0.0);
        } else {
          fragColor = clamp(_lDn, 0.0, 1.0) * u_lightColor;
        }
      }
    }
  }
}
