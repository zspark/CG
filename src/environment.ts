import log from "./log.js";
import glC from "./gl-const.js";
import { default as Thread } from "./thread.js"
import { default as TextureBaker, BakerType_e, BakerOption_t } from "./worker/texture-baker.js"
import { default as createLoader } from "./assets-loader.js";
import { rgbeArrayToRGB9E5 } from "./rgb9e5-converter.js";
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

    constructor(equirectagularURL: string) {
        super();
        const _hdr: boolean = equirectagularURL.indexOf(".hdr") >= 0;
        const _loader = createLoader("./");
        const _arrPromis = [];
        _arrPromis.push(_loader.loadTexture(equirectagularURL).then((img: TextureData_t) => {
            if (_hdr) {
                this._environmentTexture = new Texture(img.width, img.height, glC.RGB9_E5, glC.RGB, glC.UNSIGNED_INT_5_9_9_9_REV, false);
                const _data = rgbeArrayToRGB9E5(img.data as Uint8ClampedArray);
                this._environmentTexture.data = _data;
            } else {
                this._environmentTexture = new Texture(img.width, img.height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE, false);
                this._environmentTexture.data = img.data;
            }
            this._environmentTexture.genMipmap = false;
            this._environmentTexture.setParameter(glC.TEXTURE_MAG_FILTER, glC.LINEAR);
            this._environmentTexture.setParameter(glC.TEXTURE_MIN_FILTER, glC.LINEAR);
            this._environmentTexture.setParameter(glC.TEXTURE_WRAP_S, glC.REPEAT);

            let width = 256, height = 128;
            if (_hdr) {
                this._irradianceTexture = new Texture(width, height, glC.RGB9_E5, glC.RGB, glC.UNSIGNED_INT_5_9_9_9_REV, false);
            } else {
                this._irradianceTexture = new Texture(width, height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE, false);
            }
            this._irradianceTexture.genMipmap = false;
            this._irradianceTexture.setParameter(glC.TEXTURE_WRAP_S, glC.REPEAT);
            this._irradianceTexture.setParameter(glC.TEXTURE_MAG_FILTER, glC.LINEAR);
            this._irradianceTexture.setParameter(glC.TEXTURE_MIN_FILTER, glC.LINEAR);
            let _o: BakerOption_t = {
                width,
                height,
                roughness: 0,
                img,
            }
            new TextureBaker().bake(BakerType_e.IRRADIANCE, _o, true, true).then(tex => {
                this._irradianceTexture.updateData(tex.data);
            });


            width = 512, height = 256;
            const N = 8;
            this._prefilteredTexture = new Texture(width, height, glC.RGB9_E5, glC.RGB, glC.UNSIGNED_INT_5_9_9_9_REV, false);
            this._prefilteredTexture.genMipmap = false;
            this._prefilteredTexture.target = glC.TEXTURE_3D;
            this._prefilteredTexture.depth = N;
            this._prefilteredTexture.setParameter(glC.TEXTURE_WRAP_S, glC.REPEAT);
            this._prefilteredTexture.setParameter(glC.TEXTURE_WRAP_R, glC.CLAMP_TO_EDGE);
            this._prefilteredTexture.setParameter(glC.TEXTURE_MAG_FILTER, glC.LINEAR);
            this._prefilteredTexture.setParameter(glC.TEXTURE_MIN_FILTER, glC.LINEAR);

            const _arrPromise: Promise<TextureData_t>[] = [];
            for (let i = 0; i < N; ++i) {
                _arrPromise.push(new TextureBaker().bake(BakerType_e.ENVIRONMENT, { width, height, roughness: i / N, img }, true, true));
            }
            Promise.all(_arrPromise).then((a: TextureData_t[]) => {
                const _ab = new ArrayBuffer(width * height * 4 * N);
                const _u8c = new Uint32Array(_ab);
                for (let i = 0; i < N; ++i) {
                    _u8c.set((a[i].data as Uint32Array), width * height * i);
                }
                this._prefilteredTexture.updateData(_u8c);
            });
        }));

        _arrPromis.push(_loader.loadTexture("./assets/lut/brdf-lut.png").then((img: TextureData_t) => {
            //this._brdfLutTexture = new Texture(img.width, img.height,  glC.RG16F, glC.RG, glC.FLOAT, true);
            this._brdfLutTexture = new Texture(img.width, img.height, glC.RGBA, glC.RGBA, glC.UNSIGNED_BYTE);
            this._brdfLutTexture.genMipmap = false;
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
