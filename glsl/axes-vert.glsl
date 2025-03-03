#version 300 es

uniform mat4 u_vpMatrix;

layout(location = 0) in vec3 a_position;
layout(location = 3) in vec3 a_color;
layout(location = 4) in vec4 a_instanceMatrix_col0;
layout(location = 5) in vec4 a_instanceMatrix_col1;
layout(location = 6) in vec4 a_instanceMatrix_col2;
layout(location = 7) in vec4 a_instanceMatrix_col3;

out vec3 v_color;

void main() { //
  mat4 instanceMatrix = mat4(a_instanceMatrix_col0, a_instanceMatrix_col1,
                             a_instanceMatrix_col2, a_instanceMatrix_col3);
  gl_Position = u_vpMatrix * instanceMatrix * vec4(a_position, 1.0);
  v_color = a_color;
}
