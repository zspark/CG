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
uniform vec4 u_ambientColor;
uniform vec4 u_pointLightColor;
uniform vec3 u_pointLightPositionW;
uniform vec3 u_cameraPositionW;
uniform float u_alpha;

out vec4 v_color;

void main() {
    vec4 _pos = vec4(a_position, 1.0);
    gl_Position = u_mvpMatrix * _pos;

    vec3 _posW = (u_mMatrix * _pos).xyz;
    vec3 _lightDir = normalize(u_pointLightPositionW - _posW);
    float _lDn=dot(_lightDir, a_normal);

    if(_lDn<=0.0){
        v_color = u_ambientColor;
      }else{
        vec3 _cameraDir = normalize(u_cameraPositionW - _posW);
        vec3 _reflectDir = _lDn*2.0*a_normal - _lightDir;
        float specularIntensity = pow(clamp(dot(_reflectDir, _cameraDir),0.0,1.0), u_alpha);
        float diffuseIntensity = clamp(_lDn, 0.0, 1.0);
        v_color = u_ambientColor + diffuseIntensity*u_pointLightColor + specularIntensity*u_pointLightColor;
      }
}`;

const fs = `#version 300 es
precision mediump float;

in vec4 v_color;
out vec4 fragColor;
void main() {
    fragColor = v_color;
}`;

window.CG.shaderSource.gouraud = {
  fs,
  vs
};
CG.info('[shader:gouraud.js] loaded.');
})();
