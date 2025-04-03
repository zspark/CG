import glC from "./gl-const.js";
import { default as createLoader, TextureData_t } from "./assets-loader.js";
import { Event_t, default as EventDispatcher, IEventDispatcher } from "./event.js";
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

export default class Environment extends EventDispatcher {

    static EVT_LOADED: number = 1;

    private _environmentTexture: ITexture;
    private _prefilteredTexture: ITexture;
    private _irradianceTexture: ITexture;
    private _brdfLutTexture: ITexture;
    //private _irradianceTextureCube: ITexture;
    //private _environmentTextureCube: ITexture;

    /*
    constructor(width: number = 512, height: number = 256) {
        const _loader = createLoader("./");
        this._width = width;
        this._height = height;
        this._environmentTexture = new Texture(width, height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
    */
    constructor(equirectagularURL: string) {
        super();
        const _hdr: boolean = equirectagularURL.indexOf(".hdr") >= 0;
        const _loader = createLoader("./");
        const _arrPromis = [];
        _arrPromis.push(_loader.loadTexture(equirectagularURL).then((img: TextureData_t) => {
            const _texture = new Texture(img.width, img.height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE, _hdr);
            _texture.genMipmap = true;
            _texture.data = img.data;
            this._environmentTexture = _texture;
            this._environmentTexture.setParameter(glC.TEXTURE_MAG_FILTER, glC.LINEAR);
            this._environmentTexture.setParameter(glC.TEXTURE_MIN_FILTER, glC.LINEAR);

            //this._irradianceTexture = new Texture(width, height, glC.RGBA16F, glC.RGBA, glC.FLOAT, true);
            this._irradianceTexture = new Texture(512, 256, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
            this._prefilteredTexture = new Texture(512, 256, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
            this._prefilteredTexture.setParameter(glC.TEXTURE_MAG_FILTER, glC.LINEAR);
            this._prefilteredTexture.setParameter(glC.TEXTURE_MIN_FILTER, glC.LINEAR);
        }));

        ///
        /*
        this._irradianceTextureCube = new Texture(512, 512);
        this._irradianceTextureCube.target = glC.TEXTURE_CUBE_MAP;
        this._environmentTextureCube = new Texture(512, 512);
        this._environmentTextureCube.target = glC.TEXTURE_CUBE_MAP;
        */

        ///
        _arrPromis.push(_loader.loadTexture("./assets/lut/brdf-lut.png").then((img: TextureData_t) => {
            //this._brdfLutTexture = new Texture(img.width, img.height,  glC.RG16F, glC.RG, glC.FLOAT, true);
            this._brdfLutTexture = new Texture(img.width, img.height, glC.RGB, glC.RGB, glC.UNSIGNED_BYTE);
            this._brdfLutTexture.setParameter(glC.TEXTURE_MAG_FILTER, glC.LINEAR);
            this._brdfLutTexture.setParameter(glC.TEXTURE_MIN_FILTER, glC.LINEAR);
            this._brdfLutTexture.data = img.data;
        }));

        Promise.all(_arrPromis).then(() => {
            this._broadcast({
                type: Environment.EVT_LOADED,
                sender: this,
            });
        });

        //@ts-ignore
        window.env = this;
    }

    /*
    get irradianceTextureCube(): ITexture { return this._irradianceTextureCube; }
    get prefilteredTextureCube(): ITexture { return this._environmentTextureCube; }
    */

    get irradianceTexture(): ITexture {
        return this._irradianceTexture;
    }

    get brdfLutTexture(): ITexture {
        return this._brdfLutTexture;
    }

    get environmentTexture(): ITexture {
        return this._environmentTexture;
    }

    get prefilteredTexture(): ITexture {
        return this._prefilteredTexture;
    }
}
