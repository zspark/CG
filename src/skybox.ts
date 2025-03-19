import log from "./log.js";
import glC from "./gl-const.js";
import Frustum from "./frustum.js";
import { geometry } from "./geometry.js"
import { Texture, Pipeline, SubPipeline } from "./device-resource.js";
import getProgram from "./program-manager.js"
import { GLFramebuffer_C0_r32f } from "./webgl.js"
import { roMat44, Mat44, Vec4 } from "./math.js"
import { IProgram, IGeometry, IPipeline, ITexture, IRenderer, ISubPipeline } from "./types-interfaces.js";
import { ICamera } from "./camera.js";
import { Loader } from "./assets-loader.js";


export default class Skybox {

    private _latlonTexture: ITexture;
    private _plane;
    private _pipeline;

    constructor() {
        Loader.loadTexture("./assets/skybox/latlon.jpg").then((v) => {
            this._latlonTexture.updateData(v);
        });
        this._latlonTexture = new Texture(4096, 2048, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
        this._plane = geometry.createPlane(2, 2);
        const _subPipeCubeLatlon = new SubPipeline()
            .setRenderObject(this._plane)
            .setTexture(this._latlonTexture)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_skybox_latlon", this._latlonTexture.textureUnit);
            });

        this._pipeline = new Pipeline(10)
            .cullFace(false, glC.BACK)
            .depthTest(false, glC.LESS)
            .setProgram(getProgram({ position_in_ndc: true, fn_skybox_latlon: true }))
            .appendSubPipeline(_subPipeCubeLatlon)
            .validate()
    }

    get pipeline(): IPipeline {
        return this._pipeline;
    }

    update(dt: number): void {
    }
}

