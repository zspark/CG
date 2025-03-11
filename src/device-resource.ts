import log from "./log.js"
import {
    createContext_fn_t,
} from "./types-interfaces.js";

import {
    GLBuffer,
    GLProgram,
    GLPipeline,
    GLSubPipeline,
    GLTexture,
    GLSkyboxTexture,
    GLFramebuffer,
    createGLContext,
} from "./webgl.js"

let Buffer: typeof GLBuffer;
let Program: typeof GLProgram;
let Pipeline: typeof GLPipeline;
let SubPipeline: typeof GLSubPipeline;
let Texture: typeof GLTexture;
let SkyboxTexture: typeof GLSkyboxTexture;
let Framebuffer: typeof GLFramebuffer;
let createContext: createContext_fn_t;

function registWebGL(): void {
    Buffer = GLBuffer;
    Program = GLProgram;
    Pipeline = GLPipeline;
    SubPipeline = GLSubPipeline;
    Texture = GLTexture;
    SkyboxTexture = GLSkyboxTexture;
    Framebuffer = GLFramebuffer;
    createContext = createGLContext;
}

export { registWebGL, createContext, Buffer, Program, Pipeline, SubPipeline, Texture, SkyboxTexture, Framebuffer };
