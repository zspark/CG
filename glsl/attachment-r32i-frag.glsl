#version 300 es
precision mediump float;

uniform int u_uuid;

out int pickable;

void main() {  //
    pickable = u_uuid;
}
