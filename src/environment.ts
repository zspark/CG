import log from "./log.js";
import glC from "./gl-const.js";
import { default as Thread } from "./thread.js"
import { default as TextureBaker, BakerType_e } from "./worker/texture-baker.js"
import { default as createLoader } from "./assets-loader.js";
import { Event_t, default as EventDispatcher, IEventDispatcher } from "./event.js";
import {
    Texture,
    Pipeline,
    SubPipeline,
    Framebuffer,
} from "./device-resource.js";
import {
    TextureData_t,
    IProgram,
    IFramebuffer,
    IPipeline,
    ISubPipeline,
    ITexture,
} from "./types-interfaces.js";

export default class Environment extends EventDispatcher {

    static EVT_LOADED: number = 1;

    //private _arrBaker: TextureBaker[] = [];
    private _arrPipeline: IPipeline[] = [];
    private _environmentTexture: ITexture;
    private _prefilteredTexture: ITexture;
    private _irradianceTexture: ITexture;
    private _brdfLutTexture: ITexture;
    //private _irradianceTextureCube: ITexture;
    //private _environmentTextureCube: ITexture;

    constructor(equirectagularURL: string) {
        super();
        const _hdr: boolean = equirectagularURL.indexOf(".hdr") >= 0;
        const _loader = createLoader("./");
        const _arrPromis = [];
        _arrPromis.push(_loader.loadTexture(equirectagularURL).then((img: TextureData_t) => {
            const _texture = new Texture(img.width, img.height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE, _hdr);
            _texture.data = img.data;
            this._environmentTexture = _texture;
            this._environmentTexture.setParameter(glC.TEXTURE_WRAP_S, glC.REPEAT);
            this._environmentTexture.setParameter(glC.TEXTURE_MAG_FILTER, glC.LINEAR);
            this._environmentTexture.setParameter(glC.TEXTURE_MIN_FILTER, glC.LINEAR);

            const width = 512, height = 256;
            //this._irradianceTexture = new Texture(width, height, glC.RGBA16F, glC.RGBA, glC.FLOAT, true);
            this._irradianceTexture = new Texture(width, height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
            this._irradianceTexture.setParameter(glC.TEXTURE_WRAP_S, glC.REPEAT);
            this._irradianceTexture.setParameter(glC.TEXTURE_MAG_FILTER, glC.LINEAR);
            this._irradianceTexture.setParameter(glC.TEXTURE_MIN_FILTER, glC.LINEAR);

            const N = 8;
            this._prefilteredTexture = new Texture(width, height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
            this._prefilteredTexture.target = glC.TEXTURE_3D;
            this._prefilteredTexture.depth = N;
            this._prefilteredTexture.setParameter(glC.TEXTURE_WRAP_S, glC.REPEAT);
            this._prefilteredTexture.setParameter(glC.TEXTURE_WRAP_T, glC.CLAMP_TO_EDGE);
            this._prefilteredTexture.setParameter(glC.TEXTURE_WRAP_R, glC.CLAMP_TO_EDGE);
            this._prefilteredTexture.setParameter(glC.TEXTURE_MAG_FILTER, glC.LINEAR);
            this._prefilteredTexture.setParameter(glC.TEXTURE_MIN_FILTER, glC.LINEAR);

            new TextureBaker().bake(BakerType_e.IRRADIANCE, img, 0, true).then(tex => {
                this._irradianceTexture.updateData(tex.data);
            });
            const _arrPromise: Promise<TextureData_t>[] = [];
            for (let i = 0; i < N; ++i) {
                _arrPromise.push(new TextureBaker().bake(BakerType_e.ENVIRONMENT, img, i / N, true));
            }
            Promise.all(_arrPromise).then((a: TextureData_t[]) => {
                const _ab = new ArrayBuffer(width * height * 4 * N);
                const _u8c = new Uint8ClampedArray(_ab);
                for (let i = 0; i < N; ++i) {
                    _u8c.set((a[i].data as Uint8ClampedArray), width * height * 4 * i);
                }
                this._prefilteredTexture.updateData(_u8c);
            });
            //let _baker = new TextureBaker(BakerType_e.IRRADIANCE, _texture, this.irradianceTexture);
            //this._arrPipeline.push(_baker.pipeline);
            //_baker = new TextureBaker(BakerType_e.ENVIRONMENT, _texture, this._prefilteredTexture, 0);
            //this._arrPipeline.push(_baker.pipeline);
            //this._arrBaker.push(_baker);

            /*
            const _N = Math.floor(Math.log2(Math.max(width, height)));
            for (let i = 1; i <= _N; ++i) {
                let w = Math.ceil(width / Math.pow(2, i));
                let h = Math.ceil(height / Math.pow(2, i));
                const latlon = new Texture(w, h, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);

                const _level = i;
                _baker = new TextureBaker(BakerType_e.ENVIRONMENT, this.environmentTexture, latlon, i / _N);
                _baker.addListener({
                    notify: (event: Event_t): boolean => {
                        const _baker = event.sender as TextureBaker;
                        _baker.copyDataToTexture(this._prefilteredTexture, _level);
                        _baker.targetTexture.destroy();
                        return true;
                    }
                }, TextureBaker.EVT_BAKED);
                //this._arrBaker.push(_baker);
                this._arrPipeline.push(_baker.pipeline);
            }
            */

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
            this._brdfLutTexture = new Texture(img.width, img.height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
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

    get pipelines(): IPipeline[] {
        return this._arrPipeline;
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
