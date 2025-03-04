#version 300 es
precision mediump float;

//%%

#ifdef FADE_AWAY_FROM_CAMERA
    #define FADE_DISTANCE_BEGIN 10.0
    #define FADE_DISTANCE_END 30.0
    #define GRID_COLOR vec3(0.55)
in float v_distanceToCamera;
#endif

#ifdef COLOR_UNIFORM
uniform vec3 u_color;
#endif

#ifdef COLOR_VERTEX_ATTRIB
in vec3 v_color;
#endif

out vec4 fragColor;
void main() {
#ifdef COLOR_DEFAULT
    fragColor = vec4(0.0, 1.0, 1.0, 1.0);
#endif

#ifdef COLOR_UNIFORM
    fragColor = vec4(u_color, 1.0);
#endif

#ifdef COLOR_VERTEX_ATTRIB
    fragColor = vec4(v_color, 1.0);
#endif

#ifdef FADE_AWAY_FROM_CAMERA
    float alpha = 1.0 - smoothstep(FADE_DISTANCE_BEGIN, FADE_DISTANCE_END,
                                   v_distanceToCamera);
    fragColor = vec4(GRID_COLOR, alpha);
#endif
}
