import log from "./log.js"
import { default as ShaderAssembler, ShaderID_t } from "./shader-assembler.js";
import { Program } from "./webgl.js";

const _mapShader: Map<string, WebGLShader> = new Map();
const _mapProgram: Map<string, Program> = new Map();
let _cacheProgram: boolean = true;
let _cacheShader: boolean = true;

export function programManagerHint(cacheAllPrograms: boolean, cacheAllShaders: boolean): void {
    _cacheProgram = cacheAllPrograms;
    _cacheShader = cacheAllShaders;
}

export default function getProgram(gl: WebGL2RenderingContext, shaderID: ShaderID_t): Program {
    let _out = ShaderAssembler.assembleVertexSource(shaderID);
    let _out2 = ShaderAssembler.assembleFragmentSource(shaderID);
    const _id = _out.id + _out2.id;
    let _program: Program = _mapProgram.get(_id);
    if (!_program) {

        if (_cacheShader) {
            let _vertShader = _mapShader.get(_out.id);
            if (!_vertShader) {
                _vertShader = Program.compile(gl, _out.source, gl.VERTEX_SHADER);
                _mapShader.set(_out.id, _vertShader);
            }
            let _fragShader = _mapShader.get(_out2.id);
            if (!_fragShader) {
                _fragShader = Program.compile(gl, _out2.source, gl.FRAGMENT_SHADER);
                _mapShader.set(_out2.id, _fragShader);
            }

            _program = new Program(gl).link(_vertShader, _fragShader);
        } else {
            _program = new Program(gl, _out.source, _out2.source);
        }
        _mapProgram.set(_id, _program);
    }
    return _program;
}
