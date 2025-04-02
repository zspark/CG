import log from "./log.js"
import createLoader from "./assets-loader.js"

type ShaderSource_t = {
    vertHead: string,
    vertBody: string,
    fragHead: string,
    fragBody: string,
};

const SEPARATOR = "//%%";
const _sources: Map<string, ShaderSource_t> = new Map();

let _shaderSourceLoadPromise: Promise<boolean>;

function _getShaderMacro(config: ShaderConfig_t): string {
    let _macroString: string = '';
    const _arrMacros = Object.getOwnPropertyNames(config);
    _arrMacros.sort();// to alphabet order;
    for (let i = 0, N = _arrMacros.length; i < N; ++i) {
        if (config[_arrMacros[i]])
            _macroString += `#define ${_arrMacros[i].toUpperCase()}\n`;
    }
    return _macroString;
}

export type ShaderConfig_t = {
    [key: string]: boolean,
};

export type SourceContent_t = {
    id: string,
    source: string,
}

function _registSource(name: string, vert: string | string[], frag?: string) {
    let _arrVert: string[];
    let _arrFrag: string[];
    if (typeof (vert) == "string") {
        _arrVert = vert.split(SEPARATOR);
        _arrFrag = frag.split(SEPARATOR);
    } else {
        _arrVert = vert[0].split(SEPARATOR);
        _arrFrag = vert[1].split(SEPARATOR);
    }
    _sources.set(name, {
        vertHead: _arrVert[0].trim(),
        vertBody: _arrVert[1].trim(),
        fragHead: _arrFrag[0].trim(),
        fragBody: _arrFrag[1].trim()
    });
}

const ShaderAssembler: {
    loadShaderSource: (name: string, root?: string) => Promise<boolean>,
    registShaderSource: (name: string, sourceVert: string | string[], sourceFrag?: string) => void,
    assembleVertexSource: (name: string, config: ShaderConfig_t) => SourceContent_t,
    assembleFragmentSource: (name: string, config: ShaderConfig_t) => SourceContent_t,
} = {
    loadShaderSource: (name: string, root?: string): Promise<boolean> => {
        if (!_shaderSourceLoadPromise) {
            _shaderSourceLoadPromise = createLoader(root ?? './').loadShader("src/shader").then((sources) => {
                _registSource(name, sources[0], sources[1]);
                return true;
            }, _ => {
                log.vital("[ShaderAssembler] shader souce load failed!");
                return false;
            });
        }
        return _shaderSourceLoadPromise;
    },

    registShaderSource: _registSource,

    assembleVertexSource: (name: string, config: ShaderConfig_t): SourceContent_t => {
        const _macro = _getShaderMacro(config);
        const _source = _sources.get(name);
        return {
            id: `${name}-vert:${_macro}`,
            source: `${_source.vertHead}\n${_macro}\n${_source.vertBody}`,
        }
    },

    assembleFragmentSource: (name: string, config: ShaderConfig_t): SourceContent_t => {
        const _macro = _getShaderMacro(config);
        const _source = _sources.get(name);
        return {
            id: `${name}-frag:${_macro}`,
            source: `${_source.fragHead}\n${_macro}\n${_source.fragBody}`,
        }
    },

};

export default ShaderAssembler;
