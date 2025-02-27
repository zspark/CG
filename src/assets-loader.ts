import log from "./log.js"

//export type BinaryLoader = (url: string) => Promise<ArrayBuffer>;
type TextLoader = (url: string) => Promise<string>;

export type ILoader = {
    loadShader: (url: string) => Promise<[string, string]>,
    loadTexture: (url: string) => Promise<HTMLImageElement>,
}

/**
* baseURL should ended up with '\'
*/
export default function createLoader(baseURL: string): ILoader {
    const _loadFile: TextLoader = (url: string) => {
        return fetch(`${baseURL}${url}`).then(response => {
            if (!response.ok) {
                log.vital(`[assets-loader] HTTP error! status: ${response.status}
url: ${url}`);
            }
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return response.json();
            } else {
                return response.text();
            }
        }, (error) => {
            log.vital(`[assets-loader] resource load error. url: ${url}
error: ${error}`);
        });
    };

    return {
        loadShader: (sourceName: string) => {
            return Promise.all([_loadFile(`${sourceName}-vert.glsl`), _loadFile(`${sourceName}-frag.glsl`)]);
        },
        loadTexture: (url: string) => {
            return new Promise((d, f) => {
                const _image = new Image();
                _image.onload = () => {
                    d(_image);
                };
                _image.onerror = (err: any) => {
                    f(err);
                };
                _image.src = `${baseURL}${url}`;
            });
        },
    }
}

