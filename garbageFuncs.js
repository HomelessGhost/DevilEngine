import Core from "./core.js";

let getTextFromFileSync = function(path){
    let request = new XMLHttpRequest();
    request.open("GET", path, false);
    request.send(null);
    if (request.status === 200) {
        return request.responseText;
    }
};

function loadShaderResource(path, name){
    Core.shadersSrc.set(name, getTextFromFileSync(path));
}


export default loadShaderResource;