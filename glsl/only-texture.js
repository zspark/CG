if (!CG.vital) CG.vital("log.js file should be loaded first!");
window.CG ??= {};
window.CG.shaderSource ??= {};


(function () {
    const vs = `#version 300 es
layout(location=0) in vec3 a_position;
uniform mat4 u_mvpMatrix;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    gl_Position = u_mvpMatrix*vec4(a_position,1.0);
}`;






    const fs = `#version 300 es
precision mediump float;
uniform sampler2D u_texture;
in vec2 v_texCoord;
out vec4 fragColor;

void main() {
    fragColor = texture(u_texture, v_texCoord);
    //fragColor = vec4(1.0,0.0,0.0,1.0);
}`;




    window.CG.shaderSource.onlyTexture = { fs, vs };
    CG.info('[shader:only-texture.js] loaded.');
})();

