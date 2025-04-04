import log from "./log.js";
import _loadHDR from "./HDR-loader.js";
import { TextureData_t } from "./types-interfaces.js";

//export type BinaryLoader = (url: string) => Promise<ArrayBuffer>;
type TextLoader = (url: string) => Promise<string>;

export type ILoader = {
    loadText: (sourceName: string) => Promise<string>;
    loadShader_separate: (urlVert: string, urlFrag: string) => Promise<[string, string]>,
    loadShader: (url: string) => Promise<[string, string]>,
    loadTexture: (url: string) => Promise<TextureData_t>,
    loadBinary: (url: string) => Promise<void | ArrayBuffer>,
}

function _loadBinary(combinedURL: string): Promise<void | ArrayBuffer> {
    return fetch(combinedURL).then(response => {
        if (!response.ok) {
            log.warn(`[assets-loader] HTTP error! status: ${response.status}
url: ${combinedURL}`);
            return;
        }
        return response.arrayBuffer();
    }, (error) => {
        log.vital(`[assets - loader] resource load error.url: ${combinedURL}
error: ${error}`);
        return;
    });
};

function _loadFile(combinedURL: string): Promise<string> {
    return fetch(combinedURL).then(response => {
        if (!response.ok) {
            log.vital(`[assets-loader] HTTP error! status: ${response.status}
url: ${combinedURL}`);
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        } else {
            return response.text();
        }
    }, (error) => {
        log.vital(`[assets - loader] resource load error.url: ${combinedURL}
error: ${error}`);
    });
};

function _loadTexture(combinedURL: string): Promise<TextureData_t> {
    if (combinedURL.indexOf(".hdr") > 0) {
        return new Promise((res, rej) => {
            _loadHDR(combinedURL, (data: Uint8Array, width: number, height: number) => {
                res({ data, width, height, hdr: true })
            }, () => {
                rej();
            });
        });
    } else {
        return new Promise((d, f) => {
            const _image = new Image();
            _image.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = _image.width;
                canvas.height = _image.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(_image, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                //@ts-ignore
                d(imageData);
            };
            _image.onerror = (err: any) => {
                f(err);
            };
            _image.src = combinedURL;
        });
    }
}

/**
* baseURL should ended up with '\'
*/
export default function createLoader(baseURL: string): ILoader {
    return {
        loadShader_separate: (vertName: string, fragName: string) => {
            return Promise.all([_loadFile(`${baseURL}${vertName}-vert.glsl`), _loadFile(`${baseURL}${fragName}-frag.glsl`)]);
        },
        loadShader: (sourceName: string) => {
            return Promise.all([_loadFile(`${baseURL}${sourceName}-vert.glsl`), _loadFile(`${baseURL}${sourceName}-frag.glsl`)]);
        },
        loadText: (sourceName: string) => {
            return _loadFile(`${baseURL}${sourceName}`);
        },
        loadTexture: (url: string) => {
            return _loadTexture(`${baseURL}${url}`);
        },
        loadBinary: (url: string) => {
            return _loadBinary(`${baseURL}${url}`);
        }
    }
}

const Loader: ILoader = createLoader("./");
export { Loader };

