import { default as createLoader } from "./assets-loader.js";
import { TextureData_t } from "./types-interfaces.js";

export default class Thread {

    private _worker: Worker;
    private _canvas: HTMLCanvasElement;

    constructor(url: string) {
        const canvas = document.createElement("canvas");
        /*
        canvas.width = 512;
        canvas.height = 256;
        canvas.style.position = "fixed";
        canvas.style.top = "5px";
        canvas.style.left = "5px";
        document.body.appendChild(canvas);
        */
        this._canvas = canvas;
        const worker = new Worker(url, { type: "module" });
        this._worker = worker;
    }

    arun(img: TextureData_t, cbFn?: (img: TextureData_t) => void): void {
        const offscreen = this._canvas.transferControlToOffscreen();
        this._worker.postMessage({
            canvas: offscreen,
            width: 512,
            height: 256,
            roughness: 0.0,
            img,
        }, [offscreen, (img.data as Uint8ClampedArray).buffer]);

        this._worker.onmessage = (event) => {
            const img = event.data;
            cbFn && cbFn(img);
        }
    }
    run(url?: string): Thread {
        const _loader = createLoader("./");
        _loader.loadTexture(url ?? "./assets/skybox/latlon2.jpg").then((img: TextureData_t) => {
            this.arun(img);
        });
        return this;
    }
}

