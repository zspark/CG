import log from "./log.js"

//export type BinaryLoader = (url: string) => Promise<ArrayBuffer>;
type TextLoader = (url: string) => Promise<string>;

export type ILoader = {
    loadShader_separate: (urlVert: string, urlFrag: string) => Promise<[string, string]>,
    loadShader: (url: string) => Promise<[string, string]>,
    loadTexture: (url: string) => Promise<HTMLImageElement>,
    loadSkyboxTextures: (url_1: string, url_2: string, url_3: string, url_4: string, url_5: string, url_6: string) => Promise<[HTMLImageElement, HTMLImageElement, HTMLImageElement, HTMLImageElement, HTMLImageElement, HTMLImageElement]>,
}

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

function _loadTexture(combinedURL: string): Promise<HTMLImageElement> {
    return new Promise((d, f) => {
        const _image = new Image();
        _image.onload = () => {
            d(_image);
        };
        _image.onerror = (err: any) => {
            f(err);
        };
        _image.src = combinedURL;
    });
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
        loadSkyboxTextures: (url_1: string, url_2: string, url_3: string, url_4: string, url_5: string, url_6: string) => {
            return Promise.all([_loadTexture(`${baseURL}${url_1}`), _loadTexture(`${baseURL}${url_2}`), _loadTexture(`${baseURL}${url_3}`), _loadTexture(`${baseURL}${url_4}`), _loadTexture(`${baseURL}${url_5}`), _loadTexture(`${baseURL}${url_6}`)]);
        },
        loadTexture: (url: string) => {
            return _loadTexture(`${baseURL}${url}`);
        },
    }
}

