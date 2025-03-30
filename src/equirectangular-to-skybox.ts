import log from "./log.js";
import glC from "./gl-const.js";
import { geometry } from "./geometry.js"
import { Event_t, default as EventDispatcher, IEventDispatcher } from "./event.js";
import {
    Texture,
    Pipeline,
    SubPipeline,
    Framebuffer,
} from "./device-resource.js";
import { createProgram } from "./program-manager.js"
import {
    IProgram,
    IGeometry,
    IPipeline,
    ITexture,
} from "./types-interfaces.js";
import { Loader, TextureData_t } from "./assets-loader.js";
import { Mat44 } from "./math.js";

const _equirectangularToSkybox: string[] = [
    `#version 300 es
#define SHADER_NAME equirectangular_to_Skybox
precision mediump float;

uniform mat4 u_instnaceMat[6];
layout(location = 0) in vec3 a_position;

out vec4 v_worldPos;
flat out int v_instanceID;

void main() {
    mat4 _instanceMatrix = u_instnaceMat[gl_InstanceID];
    vec4 _pos = vec4(a_position, 1.0);
    v_worldPos = _instanceMatrix * _pos;
    v_instanceID = gl_InstanceID;
    gl_Position =  _pos;
}`
    ,

    `#version 300 es
#define SHADER_NAME equirectangular_to_Skybox
precision mediump float;
#define PI2 6.283185307179586
#define PI 3.14159265359
in vec4 v_worldPos;
flat in int v_instanceID;

layout(location=0) out vec4 o_fragColor0;
layout(location=1) out vec4 o_fragColor1;
layout(location=2) out vec4 o_fragColor2;
layout(location=3) out vec4 o_fragColor3;
layout(location=4) out vec4 o_fragColor4;
layout(location=5) out vec4 o_fragColor5;

uniform sampler2D u_equirectangularMap;

const vec2 invAtan = vec2(0.15915494309189535, 0.3183098861837907);
vec2 directionToUV(const in vec3 dir){
    vec2 uv = vec2(atan(dir.z, dir.x), asin(dir.y));
    uv *= invAtan;
    uv += .5;
    //uv.x += .5;
    //uv.y = .5 - uv.y;
    return uv;
}

void main() {
    vec3 _dir=normalize(v_worldPos.xyz);
    vec2 uv = directionToUV(_dir);
    vec3 color = texture(u_equirectangularMap, uv).rgb;
    if(v_instanceID==0){
        o_fragColor0 = vec4(color, 1.0);
    }else if(v_instanceID==1){
        o_fragColor1 = vec4(color, 1.0);
    }else if(v_instanceID==2){
        o_fragColor2 = vec4(color, 1.0);
    }else if(v_instanceID==3){
        o_fragColor3 = vec4(color, 1.0);
    }else if(v_instanceID==4){
        o_fragColor4 = vec4(color, 1.0);
    }else if(v_instanceID==5){
        o_fragColor5 = vec4(color, 1.0);
    }
}`
]

export default class EquirectangularToSkybox extends EventDispatcher {

    static FILE_LOADED: number = 1;

    private _skyboxTexture: ITexture;
    private _latlonTexture: ITexture;
    private _plane: IGeometry;
    private _pipelineConvert;
    private _instanceMatrices: Float32Array = new Float32Array(6 * 16);

    /**
    * width,height: skybox image size per face;
    */
    constructor(url: string, width: number = 512, height: number = 512) {
        super();
        this._plane = geometry.createFrontQuad(-1).setDrawArraysInstancedParameters(glC.TRIANGLES, 0, 6, 6);
        Loader.loadTexture(url).then((img: TextureData_t) => {
            this._latlonTexture = new Texture(img.width, img.height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
            this._latlonTexture.data = img.data;
            const _subp = new SubPipeline()
                .setRenderObject(this._plane)
                .setTexture(this._latlonTexture)
                .setUniformUpdaterFn((program: IProgram) => {
                    program.uploadUniform("u_equirectangularMap", this._latlonTexture.textureUnit);
                    program.uploadUniform("u_instnaceMat[0]", this._instanceMatrices);
                });
            this._pipelineConvert.appendSubPipeline(_subp);
            this._broadcast({
                type: EquirectangularToSkybox.FILE_LOADED,
                sender: this,
            });
        });

        const _instanceMatricesHandler = new Mat44(this._instanceMatrices, 16 * 0);
        Mat44.createRotateAroundY(Math.PI / 2, _instanceMatricesHandler);
        _instanceMatricesHandler.remap(this._instanceMatrices, 16 * 1);
        Mat44.createRotateAroundY(-Math.PI / 2, _instanceMatricesHandler);

        _instanceMatricesHandler.remap(this._instanceMatrices, 16 * 2);
        Mat44.createRotateAroundX(Math.PI / 2, _instanceMatricesHandler);
        _instanceMatricesHandler.multiply(Mat44.createRotateAroundY(Math.PI), _instanceMatricesHandler);
        _instanceMatricesHandler.remap(this._instanceMatrices, 16 * 3);
        Mat44.createRotateAroundX(-Math.PI / 2, _instanceMatricesHandler);
        _instanceMatricesHandler.multiply(Mat44.createRotateAroundY(Math.PI), _instanceMatricesHandler);

        _instanceMatricesHandler.remap(this._instanceMatrices, 16 * 4);
        Mat44.createRotateAroundY(Math.PI, _instanceMatricesHandler);
        _instanceMatricesHandler.remap(this._instanceMatrices, 16 * 5);
        _instanceMatricesHandler.copyFrom(Mat44.IdentityMat44);

        this._skyboxTexture = new Texture(width, height);
        this._skyboxTexture.target = glC.TEXTURE_CUBE_MAP;
        const _backFBO = new Framebuffer(width, height);
        for (let i = 0; i < 6; ++i) {
            _backFBO.attachColorTexture(this._skyboxTexture, i);
        }

        const _db = [1, 1, 1, 1, 1, 1].map((_, i) => glC.COLOR_ATTACHMENT0 + i);
        this._pipelineConvert = new Pipeline(10)
            .setFBO(_backFBO)
            .drawBuffers(..._db)
            .cullFace(false, glC.BACK)
            .blend(true, glC.SRC_ALPHA, glC.ONE_MINUS_SRC_ALPHA, glC.FUNC_ADD)
            .depthTest(false, glC.LESS)
            .setProgram(createProgram(_equirectangularToSkybox))
            .validate()

    }

    get pipeline(): IPipeline {
        return this._pipelineConvert;
    }

    get skyboxTexture(): ITexture {
        return this._skyboxTexture;
    }

    get equirectangularTexture(): ITexture {
        return this._latlonTexture;
    }

    update(dt: number): void {
    }
}

