import log from "./log.js"
import createLoader from "./assets-loader.js"

const SEPARATOR = "//%%";
const VERTEX_SHADER: string[] = [];
const FRAGMENT_SHADER: string[] = [];

let _shaderSourceLoadPromise: Promise<boolean>;

function _separateShader(source: string, out: string[]): void {
    let _arr: string[] = source.split(SEPARATOR);
    out[0] = _arr[0].trim();
    out[1] = _arr[1].trim();
}

function _getShaderSource(id: ShaderID_t, source: string[]): SourceContent_t {
    let _macroString: string = '';
    const _arrMacros = Object.getOwnPropertyNames(id);
    _arrMacros.sort();// to alphabet order;
    for (let i = 0, N = _arrMacros.length; i < N; ++i) {
        _macroString += `#define ${_arrMacros[i].toUpperCase()}\n`;
    }
    return {
        id: _macroString,
        source: `${source[0]}\n${_macroString}\n${source[1]}`,
    };
}

export type ShaderID_t = {
    fade_away_from_camera?: boolean,
    instanced_matrix?: boolean,
    position_pass_through?: boolean,

    color_default?: boolean,
    color_uniform?: boolean,
    color_vertex_attrib?: boolean,
};

export type SourceContent_t = {
    id: string,
    source: string,
}

const ShaderAssembler: {
    loadShaderSource: (root?: string) => Promise<boolean>,
    assembleVertexSource: (id: ShaderID_t) => SourceContent_t,
    assembleFragmentSource: (id: ShaderID_t) => SourceContent_t,
} = {
    loadShaderSource: (root?: string): Promise<boolean> => {
        if (!_shaderSourceLoadPromise) {
            _shaderSourceLoadPromise = createLoader(root ?? './').loadShader("src/shader").then((sources) => {
                _separateShader(sources[0], VERTEX_SHADER);
                _separateShader(sources[1], FRAGMENT_SHADER);
                return true;
            }, _ => {
                log.vital("[ShaderAssembler] shader souce load failed!");
                return false;
            });
        }
        return _shaderSourceLoadPromise;
    },

    assembleVertexSource: (id: ShaderID_t): SourceContent_t => {
        return _getShaderSource(id, VERTEX_SHADER);
    },

    assembleFragmentSource: (id: ShaderID_t): SourceContent_t => {
        return _getShaderSource(id, FRAGMENT_SHADER);
    },

};

export default ShaderAssembler;
