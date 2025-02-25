if (!CG.vital)
  CG.vital("log.js file should be loaded first!");
window.CG ??= {};
window.CG.shaderSource ??= {};

(function() {
const vs = `#version 300 es
layout(location=0) in vec3 a_position;
layout(location=2) in vec3 a_normal;
uniform mat4 u_mvpMatrix;
uniform mat4 u_mMatrix;

out vec3 v_positionW;
out vec3 v_normalW;
void main() {
    vec4 _pos = vec4(a_position, 1.0);
    gl_Position = u_mvpMatrix * _pos;

    v_positionW = (u_mMatrix * _pos).xyz;
    v_normalW = (u_mMatrix * vec4(a_normal, 0.0)).xyz;
}`;

const fs = `#version 300 es
precision mediump float;

uniform vec4 u_ambientColor;
uniform vec4 u_pointLightColor;
uniform vec3 u_pointLightPositionW;
uniform vec3 u_cameraPositionW;
uniform float u_alpha;

in vec3 v_positionW;
in vec3 v_normalW;
out vec4 fragColor;
void main() {
   vec3 _normalW = normalize(v_normalW);
    vec3 _lightDir = normalize(u_pointLightPositionW - v_positionW);
    float _lDn=dot(_lightDir, _normalW);
    if(_lDn<=0.0){
        fragColor = u_ambientColor;
      }else{
        vec3 _cameraDir = normalize(u_cameraPositionW - v_positionW);
       vec3 _halfDir = (_cameraDir+_lightDir)*.5;
        float specularIntensity = pow(clamp(dot(_halfDir, _normalW),0.0,1.0), u_alpha);
        float diffuseIntensity = clamp(_lDn, 0.0, 1.0);
        fragColor = u_ambientColor + diffuseIntensity*u_pointLightColor + specularIntensity*u_pointLightColor;
      }
}`;

window.CG.shaderSource.blinnPhong = {
  fs,
  vs
};
CG.info('[shader:blinn-phong.js] loaded.');
})();
