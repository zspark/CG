
function assertEqual(a,b,epsilon=0.001){
    const _f=()=>{console.error("%c[FAILED] assertEqual:"+a+","+b,"color:red");}
    if(typeof a ==="number" && typeof b==="number"){
        if(Math.abs(a-b)<epsilon){
            console.info("%c[PASSED]","color:green");
        }else _f();
        return;
    }
    if(a==b){
        console.info("%c[PASSED]","color:green");
    }else{ _f();return }
}

function assertNotEqual(a,b,epsilon=0.001){
    const _f=()=>{console.error("%c[FAILED] assertNotEqual:"+a+","+b,"color:red");}
    if(typeof a ==="number" && typeof b==="number"){
        if(Math.abs(a-b)>=epsilon){
            console.info("%c[PASSED]","color:green");
        }else _f();
        return;
    }
    if(a!=b){
        console.info("%c[PASSED]","color:green");
    }else{ _f();return }
}

window.CG??={};
window.CG.assertEqual=assertEqual;
window.CG.assertNotEqual=assertNotEqual;

console.log('[assert.js] loaded.');
