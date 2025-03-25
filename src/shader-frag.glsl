#version 300 es
precision mediump float;
precision highp sampler2DShadow;

//%%

#define INDEX_NORMAL 0
#define INDEX_OCCLUSION 1
#define INDEX_EMISSIVE 2
#define INDEX_BASE_COLOR 3
#define INDEX_METALLIC_ROUGHNESS 4

#define PI2 6.283185307179586
#define PI 3.14159265359
#define ONE_OVER_PI 0.3183098861837907
#define PI_2 1.5707963267948966

// uniform sampler2D u_depthTexture_r32f;
// uniform sampler2D u_skybox_latlon;

layout(std140) uniform u_ub_camera {
    mat4 u_vInvMatrix;
    mat4 u_vMatrix;
    mat4 u_pMatrix;
    mat4 u_pInvMatrix;
    mat4 u_vpMatrix;
};
layout(std140) uniform u_ub_light {
    mat4 u_lInvMatrix;
    mat4 u_lMatrix;
    mat4 u_lpMatrix;
    vec3 u_ambientColor;
    vec4 u_lightColor;  // w: intensity;
};
layout(std140) uniform u_ub_material {
    float u_roughnessFactor;
    float u_metallicFactor;
    float u_normalTextureScale;
    float u_occlusionTextureStrength;
    vec4 u_baseColorFactor;
    vec3 u_emissiveFactor;
};
uniform sampler2DShadow u_shadowMap;
uniform sampler2D u_pbrTextures[5];
uniform int u_pbrTextureCoordIndex[5];

#ifdef DEBUG
    #define DBG_INDEX_NORMAL 0
    #define DBG_INDEX_OCCLUSION 1
    #define DBG_INDEX_EMISSIVE 2
    #define DBG_INDEX_BASE_COLOR 3
    #define DBG_INDEX_METALLIC 4
    #define DBG_INDEX_ROUGHNESS 5
    #define DBG_INDEX_F0 6
uniform int u_textureDebug;
#endif

in vec3 v_normal;
in vec3 v_positionW;
in vec3 v_normalW;
in vec3 v_tangentW;
in vec3 v_color;
in vec4 v_positionLProj;
in vec2 v_arrayUV[5];

out vec4 o_fragColor;

vec3 _fresnel(float ndotv, in vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - ndotv, 5.0);
}

float _geometry(float ndotv, float roughness) {
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    return ndotv / (ndotv * (1.0 - k) + k);
}

float _normalDistribution(float ndoth, float roughness) {
    float alpha = roughness * roughness;
    float alpha2 = alpha * alpha;
    float NdotH2 = ndoth * ndoth;

    float nom = alpha2;
    float denom = (NdotH2 * (alpha2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return nom / max(denom, 0.001);  // Avoid division by zero
}

vec3 _getNormalW() {
    vec3 _normalW = normalize(v_normalW);
    if (dot(v_tangentW.xyz, v_tangentW.xyz) <= .9) {
        return _normalW;
    }

    vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_NORMAL]];
    vec3 _normalTBN = texture(u_pbrTextures[INDEX_NORMAL], _uv).rgb * 2.0 - 1.0;
    _normalTBN.x *= u_normalTextureScale;
    _normalTBN.y *= u_normalTextureScale;
    vec3 _tangentW = normalize(v_tangentW);
    vec3 _biTangentW = normalize(cross(_normalW, _tangentW));
    mat3 _TBN = mat3(_tangentW, _biTangentW, _normalW);
    return _TBN * normalize(_normalTBN);
}

vec2 _getMetallicAndRoughtness() {
    vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_METALLIC_ROUGHNESS]];
    vec2 _value = texture(u_pbrTextures[INDEX_METALLIC_ROUGHNESS], _uv).zy;
    return _value * vec2(u_metallicFactor, u_roughnessFactor);
}

vec4 _getBaseColor() {
    vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_BASE_COLOR]];
    return texture(u_pbrTextures[INDEX_BASE_COLOR], _uv) * u_baseColorFactor;
}

/**
 * map depth from (0-1) to (near - far), all positive valus
uniform vec2 u_nearFarPlane;
float _linearizeDepth(float depth) {
    return (2.0 * u_nearFarPlane.x * u_nearFarPlane.y) /
           (u_nearFarPlane.y + u_nearFarPlane.x -
            (depth * 2. - 1.) * (u_nearFarPlane.y - u_nearFarPlane.x));
}
 */
float _calculateShadowFactor(const in vec4 posProj) {
#ifdef FT_SHADOW
    vec3 _pos = posProj.xyz / posProj.w;
    _pos = _pos * .5 + .5;
    _pos.z -= 0.005;

    float shadow = 0.0;
    float samples = 3.0;
    float offset = 0.002;  // Small offset for sampling nearby texels

    for (float x = -1.0; x <= 1.0; x += 1.0) {
        for (float y = -1.0; y <= 1.0; y += 1.0) {
            vec3 sampleCoord = _pos + vec3(x * offset, y * offset, 0.0);
            shadow += texture(u_shadowMap, sampleCoord);
        }
    }

    return shadow / (samples * samples);
#else
    return 1.;
#endif
}

vec3 _getAmbient(const in vec4 albedoColor) {
    return 0.5 * u_ambientColor * albedoColor.rgb;
}

vec3 _getDiffuse(float ndotl, const in vec3 albedoColor, const in vec3 F0, float shadowMapFactor) {
#ifdef FT_PBR
    if (ndotl <= 0.0) {
        return vec3(.0);
    } else {
        return ndotl * ONE_OVER_PI * albedoColor * u_lightColor.xyz * u_lightColor.w * shadowMapFactor * (1.0 - F0);
    }
#else
    if (ndotl <= 0.0) {
        return vec3(.0);
    } else {
        return ndotl * albedoColor * u_lightColor.xyz * u_lightColor.w * shadowMapFactor * (1.0 - F0);
    }
#endif
}

vec3 _getHighlight(float ndotl, float ndotv, float ndoth, float vdoth, float roughness, const in vec3 F0, float shadowMapFactor) {
#ifdef FT_PBR
    vec3 F = _fresnel(ndotv, F0);
    // return vec3(F);
    float D = _normalDistribution(ndoth, roughness);
    // return vec3(D);
    float G = _geometry(ndotv, roughness) * _geometry(ndotl, roughness);
    // return vec3(G);
    vec3 specular = (D * F * G) / max(4.0 * ndotv * ndotl, 0.001);
    return max(specular, .0001) * u_lightColor.rgb * u_lightColor.w * shadowMapFactor;
#else
    if (ndotl <= 0.0) {
        return vec3(.0);
    } else {
        float specularIntensity = pow(ndoth, (2.0 - roughness) * 20.);
        return specularIntensity * u_lightColor.rgb * shadowMapFactor;
    }
#endif
}

void main() {
    vec2 _metallicAndRoughness = _getMetallicAndRoughtness();
    vec4 _baseColor = _getBaseColor();
    vec3 _normalW = _getNormalW();
    vec3 _lightDir = normalize(vec3(u_lInvMatrix[3][0], u_lInvMatrix[3][1], u_lInvMatrix[3][2]) - v_positionW);
    vec3 _cameraDir = normalize(vec3(u_vInvMatrix[3][0], u_vInvMatrix[3][1], u_vInvMatrix[3][2]) - v_positionW);
    vec3 _halfDir = normalize(_cameraDir + _lightDir);
    float _shadowMapFactor = _calculateShadowFactor(v_positionLProj);

    float _ndotl = max(dot(_normalW, _lightDir), 0.0);   // Normal and light direction dot product
    float _ndotv = max(dot(_normalW, _cameraDir), 0.0);  // Normal and view direction dot product
    float _ndoth = max(dot(_normalW, _halfDir), 0.0);    // Normal and halfway vector dot product
    float _vdoth = max(dot(_cameraDir, _halfDir), 0.0);  // View direction and halfway vector dot product

    vec3 _F0 = mix(vec3(0.04), _baseColor.rgb, _metallicAndRoughness.x);
    vec3 _ambient = _getAmbient(_baseColor);
    vec3 _diffuse = _getDiffuse(_ndotl, _baseColor.rgb, _F0, _shadowMapFactor);
    vec3 _highlight = _getHighlight(
        _ndotl, _ndotv, _ndoth, _vdoth,
        _metallicAndRoughness.y,
        _F0,
        _shadowMapFactor);
    vec3 _color = _ambient + _diffuse + _highlight;
    float _alpha = _baseColor.a;

#ifdef DEBUG
    if (u_textureDebug == DBG_INDEX_NORMAL) {
        vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_NORMAL]];
        vec4 _normalTBN = texture(u_pbrTextures[INDEX_NORMAL], _uv);
        _color = _normalTBN.rgb;
        _alpha = 1.;
    } else if (u_textureDebug == DBG_INDEX_OCCLUSION) {
    } else if (u_textureDebug == DBG_INDEX_EMISSIVE) {
    } else if (u_textureDebug == DBG_INDEX_BASE_COLOR) {
        vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_BASE_COLOR]];
        vec4 _value = texture(u_pbrTextures[INDEX_BASE_COLOR], _uv);
        _color = _value.rgb;
        _alpha = _value.a;
    } else if (u_textureDebug == DBG_INDEX_METALLIC) {
        vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_METALLIC_ROUGHNESS]];
        float _value = texture(u_pbrTextures[INDEX_METALLIC_ROUGHNESS], _uv).z;
        _color = vec3(_value);
        _alpha = 1.;
    } else if (u_textureDebug == DBG_INDEX_ROUGHNESS) {
        vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_METALLIC_ROUGHNESS]];
        float _value = texture(u_pbrTextures[INDEX_METALLIC_ROUGHNESS], _uv).y;
        _color = vec3(_value);
        _alpha = 1.;
    } else if (u_textureDebug == DBG_INDEX_F0) {
        vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_BASE_COLOR]];
        vec4 _baseColor = texture(u_pbrTextures[INDEX_BASE_COLOR], _uv);
        _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_METALLIC_ROUGHNESS]];
        float _value = texture(u_pbrTextures[INDEX_METALLIC_ROUGHNESS], _uv).z;
        _color = mix(vec3(0.04), _baseColor.rgb, _value);
        _alpha = 1.;
    }
#endif

#ifdef GAMMA_CORRECT
    const float gammaFactor = (1.0 / 2.2);
    _color = pow(_color, vec3(gammaFactor));
#endif

    o_fragColor = vec4(_color, _alpha);
}
