if (!CG.vital) CG.vital("log.js file should be loaded first!");
window.CG ??= {};
(function () {


    /**
    * baseURL should ended up with '\'
    */
    function createResourceLoader(baseURL) {
        const _loadFile = (url) => {
            return fetch(`${baseURL}${url}`).then(response => {
                if (!response.ok) {
                    CG.vital(`[assets-loader] HTTP error! status: ${response.status}
url: ${url}`);
                }
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    return response.json();
                } else {
                    return response.text();
                }
            }, (error) => {
                CG.vital(`[assets-loader] resource load error. url: ${url}
error: ${error}`);
            });
        };
        return {
            loadShader: (sourceName) => {
                return Promise.all([_loadFile(`${sourceName}-vert.glsl`), _loadFile(`${sourceName}-frag.glsl`)]);
            },
            loadTexture: (url) => {
                return new Promise((d, f) => {
                    const _image = new Image();
                    _image.onload = () => {
                        d(_image);
                    };
                    _image.onfail = (err) => {
                        f(err);
                    };
                    _image.src = `${baseURL}${url}`;
                });
            },
        }
    }

    window.CG.createResourceLoader = createResourceLoader;

    CG.info('[assets-loader.js] loaded.');
})()
