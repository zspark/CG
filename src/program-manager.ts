import log from "./log.js"
import { default as ShaderAssembler, ShaderID_t } from "./shader-assembler.js";
import { Program } from "./device-resource.js";
import { IProgram } from "./types-interfaces.js";

const _mapShader: Map<string, WebGLShader> = new Map();
const _mapProgram: Map<string, IProgram> = new Map();
let _cacheProgram: boolean = true;
let _cacheShader: boolean = true;

export function programManagerHint(cacheAllPrograms: boolean, cacheAllShaders: boolean): void {
    _cacheProgram = cacheAllPrograms;
    _cacheShader = cacheAllShaders;
}

let _gl: WebGL2RenderingContext;
export function initProgram(gl: WebGL2RenderingContext): void {
    _gl = gl;
}

export default function getProgram(shaderID: ShaderID_t): IProgram {
    let _out = ShaderAssembler.assembleVertexSource(shaderID);
    let _out2 = ShaderAssembler.assembleFragmentSource(shaderID);
    const _id = _out.id + _out2.id;
    let _program: IProgram = _mapProgram.get(_id);
    if (!_program) {

        if (_cacheShader) {
            let _vertShader = _mapShader.get(_out.id);
            if (!_vertShader) {
                _vertShader = Program.compile(_gl, _out.source, _gl.VERTEX_SHADER);
                _mapShader.set(_out.id, _vertShader);
            }
            let _fragShader = _mapShader.get(_out2.id);
            if (!_fragShader) {
                _fragShader = Program.compile(_gl, _out2.source, _gl.FRAGMENT_SHADER);
                _mapShader.set(_out2.id, _fragShader);
            }

            _program = new Program(_gl).link(_vertShader, _fragShader);
        } else {
            _program = new Program(_gl, _out.source, _out2.source);
        }
        _mapProgram.set(_id, _program);
    }
    return _program;
}

export function createProgram(vert: string | string[], frag?: string): IProgram {
    if (typeof (vert) === "string") {
        return new Program(_gl, vert, frag);
    } else {
        return new Program(_gl, vert[0], vert[1]);
    }

}
