if (!CG.vital) CG.vital("log.js file should be loaded first!");
window.CG ??= {};
window.CG.shaderSource ??= {};


(function () {
    const vs = `#version 300 es
uniform mat4 u_mvpMatrix;
layout(location=0) in vec3 a_position;
void main() {
    gl_Position = u_mvpMatrix*vec4(a_position,1.0);
}`;



    const fs = `#version 300 es
precision mediump float;
uniform vec3 u_color;
out vec4 fragColor;
void main() {
    fragColor = vec4(u_color, 0.5);
}`;




    window.CG.shaderSource.transparent = { fs, vs };
    CG.info('[shader:transparent.js] loaded.');
})();

