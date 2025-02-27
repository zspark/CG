#version 300 es
precision mediump float;

uniform samplerCube u_skybox;

in vec3 v_uvSkybox;
out vec4 fragColor;

void main() { fragColor = texture(u_skybox, v_uvSkybox); }
