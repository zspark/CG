function warn(...args){
    console.warn("%c[WARN]","color:yellow",...args);
}
function info(...args){
    console.info("%c[INFO]","color:green",...args);
}
function vital(...args){
    console.error("%c[VITAL]","color:red",...args);
    throw "vital error!!";
}
function log(...args){
    console.log("[LOG]",...args);
}

window.CG??={};
window.CG.warn=warn;
window.CG.info=info;
window.CG.vital=vital;
window.CG.log=log;

console.log('[log.js] loaded.');
