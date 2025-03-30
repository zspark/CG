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
    GLFramebuffer,
    GLUniformBlock,
    createGLContext,
} from "./webgl.js"

let Buffer: typeof GLBuffer;
let Program: typeof GLProgram;
let Pipeline: typeof GLPipeline;
let SubPipeline: typeof GLSubPipeline;
let Texture: typeof GLTexture;
let Framebuffer: typeof GLFramebuffer;
let UniformBlock: typeof GLUniformBlock;
let createContext: createContext_fn_t;

function registWebGL(): void {
    Buffer = GLBuffer;
    Program = GLProgram;
    Pipeline = GLPipeline;
    SubPipeline = GLSubPipeline;
    Texture = GLTexture;
    Framebuffer = GLFramebuffer;
    UniformBlock = GLUniformBlock;
    createContext = createGLContext;
}

export { registWebGL, createContext, UniformBlock, Buffer, Program, Pipeline, SubPipeline, Texture, Framebuffer };
