import log from "./log.js"
import {
    createContext_fn_t,
} from "./types-interfaces.js";

import {
    GLBuffer,
    GLProgram,
    GLPipeline,
    GLSubPipeline,
    GLRenderer,
    GLTexture,
    GLSkyboxTexture,
    GLFramebuffer,
    createGLContext,
} from "./webgl.js"

let Buffer: typeof GLBuffer;
let Program: typeof GLProgram;
let Pipeline: typeof GLPipeline;
let SubPipeline: typeof GLSubPipeline;
let Renderer: typeof GLRenderer;
let Texture: typeof GLTexture;
let SkyboxTexture: typeof GLSkyboxTexture;
let Framebuffer: typeof GLFramebuffer;
let createContext: createContext_fn_t;

function registWebGL(): void {
    Buffer = GLBuffer;
    Program = GLProgram;
    Pipeline = GLPipeline;
    SubPipeline = GLSubPipeline;
    Renderer = GLRenderer;
    Texture = GLTexture;
    SkyboxTexture = GLSkyboxTexture;
    Framebuffer = GLFramebuffer;
    createContext = createGLContext;
}

export { registWebGL, createContext, Buffer, Program, Pipeline, SubPipeline, Texture, SkyboxTexture, Framebuffer, Renderer };
