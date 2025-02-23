const colorCube = {
    vs: `#version 300 es
in vec3 a_position;
in vec3 a_color;
out vec3 v_color;
uniform mat4 u_vpMatrix;
void main() {
    v_color=a_color;
    gl_Position = u_vpMatrix*vec4(a_position,1.0);
}`,
    fs: `#version 300 es
precision mediump float;
//const float gammaFactor = (1.0/2.2);
//const float gammaFactor = 2.2;
in vec3 v_color;
out vec4 fragColor;
void main() {
    //fragColor = pow(vec4( v_color, 1.0), vec4(gammaFactor));
    fragColor = vec4( v_color, 1.0);
    //fragColor = vec4(1.0,0.0,0.0,1.0);
}`,
};

const shaderSource = Object.freeze({
    colorCube,
});


window.CG ??= {};
window.CG.shaderSource = shaderSource;

console.log('[glsl.js] loaded.');
