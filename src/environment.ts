import glC from "./gl-const.js";
import { default as createLoader, TextureData_t } from "./assets-loader.js";
import {
    Texture,
    Pipeline,
    SubPipeline,
    Framebuffer,
} from "./device-resource.js";
import {
    IProgram,
    IFramebuffer,
    IPipeline,
    ISubPipeline,
    ITexture,
} from "./types-interfaces.js";

export default class Environment {

    private _irradianceTexture: ITexture;
    private _prefilteredTexture: ITexture;
    private _irradianceTextureCube: ITexture;
    private _prefilteredTextureCube: ITexture;
    private _brdfLutTexture: ITexture;
    private _width: number;
    private _height: number;

    constructor(width: number = 512, height: number = 256) {
        this._width = width;
        this._height = height;
        this._prefilteredTexture = new Texture(width, height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
        this._brdfLutTexture = new Texture(512, 512, glC.RGB, glC.RGB, glC.UNSIGNED_BYTE);
        //this._brdfLutTexture = new Texture(512,512,  glC.RG16F, glC.RG, glC.FLOAT);
        this._irradianceTexture = new Texture(width, height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
        //this._irradianceTexture = new Texture(width, height, glC.RGBA16F, glC.RGBA, glC.FLOAT);

        this._irradianceTextureCube = new Texture(512, 512);
        this._irradianceTextureCube.target = glC.TEXTURE_CUBE_MAP;
        this._prefilteredTextureCube = new Texture(512, 512);
        this._prefilteredTextureCube.target = glC.TEXTURE_CUBE_MAP;

        createLoader("./").loadTexture("./assets/lut/brdf-lut.png").then((img: TextureData_t) => {
            this._brdfLutTexture.data = img.data;
        });

        //@ts-ignore
        window.env = this;
    }

    get width(): number {
        return this._width;
    }

    get height(): number {
        return this._height;
    }

    get irradianceTextureCube(): ITexture {
        return this._irradianceTextureCube;
    }

    get irradianceTexture(): ITexture {
        return this._irradianceTexture;
    }

    get brdfLutTexture(): ITexture {
        return this._brdfLutTexture;
    }

    get prefilteredTextureCube(): ITexture {
        return this._prefilteredTextureCube;
    }

    get prefilteredTexture(): ITexture {
        return this._prefilteredTexture;
    }
}
