
import Core               from "./core.js";
import InputTracker       from "./Input/InputTracker.js"
import RenderLoop         from "./RenderLoop.js";
import GL                 from "./gl.js";
import UBO                from "./UBO.js";
import FBO, { FBO_2 }     from "./FBO.js";
import VAO                from "./VAO.js";
import Camera             from "./Components/Camera.js";


// SYSTEMS
//////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////

function launch() {
    Core.canvas = document.getElementById("game-engine-canvas");

    
    Core.loop  = new RenderLoop(onRender);
    GL.init(Core.canvas);
    Core.gl = GL.ctx;
    GL.setClearColor("#FFFFFF");
    GL.fitScreen(1, 1);
    Core.input = new InputTracker();

    Core.fbo = FBO.build("picking", 2, true);

    let fbo = new FBO_2();

    Core.fboPick = fbo.create().multiSampleColorBuffer("bColor", 0, 5).multiSampleColorBuffer("pColor", 1,5).depthBuffer(true, 5).finalize("fboRender");

    Core.fboFinal = fbo.create().texColorBuffer("bColor",0).texColorBuffer("pColor",1).finalize("fboColorTex");



    window.addEventListener("resize", function(){
        GL.fitScreen(1, 1);
        Camera.setProjection(Core.camera.com.Camera);
        Core.input.updateBoundingRect();
        FBO_2.delete(Core.fboFinal);
        FBO_2.deleteMS(Core.fboPick);
        let fbo = new FBO_2();

         Core.fboPick = fbo.create().multiSampleColorBuffer("bColor", 0, 5).multiSampleColorBuffer("pColor", 1,5).depthBuffer(true, 5).finalize("fboRender");

        Core.fboFinal = fbo.create().texColorBuffer("bColor",0).texColorBuffer("pColor",1).finalize("fboColorTex");

        Core.fbo = FBO.build("picking", 2, true);
    });


    let UBOTransform = new UBO("UBOTransform", 0)
        .addItems(
            "projViewMatrix",	"mat4",
            "cameraPos",		"vec3",
            "globalTime",		"float",
            "screenSize",		"vec2"
        ).finalize()
        .updateItem("screenSize", new Float32Array( [ GL.width, GL.height ] ) )
        .updateGL();


    let UBOModel = new UBO("UBOModel", 2)
        .addItems( "modelMatrix","mat4",  "normalMatrix","mat3" )
        .finalize();
}

function runScene(name) {
    Core.loop.stop();
    Core.currentScene = Core.scenes.get(name);
    Core.camera = Core.currentScene.camera;
    Core.loop.start();
    Core.loop.runFull();
}

function addScene(name, sceneObj){ Core.scenes.set(name, sceneObj); }

function onRender(dt, ss) {
    Core.currentScene.ECS.updateSystems();
}


export default { launch, runScene, addScene };