import GL from "./gl.js";
import Shader from "./Shader.js";
import loadShaderResource from "./garbageFuncs.js";
import Core from "./core.js";
import FacedCube from "./Primitives/FacedCube.js";
import { Vec3 }	from "./Maths.js";


let initSkybox = function(ecs){
	let tex = GL.loadCubeMap("skybox",[
					document.getElementById("cube_right"),document.getElementById("cube_left"),
					document.getElementById("cube_top"),document.getElementById("cube_bottom"),
					document.getElementById("cube_back"),document.getElementById("cube_front")
	]);

	loadShaderResource('./Shaders/skyBoxVertex.vs', 'skybox_v');
    loadShaderResource('./Shaders/skyBoxFragment.fs', 'skybox_f');

    let shader = new Shader("SkyBoxShader", Core.shadersSrc.get("skybox_v"), Core.shadersSrc.get("skybox_f"));
    shader.prepareUniform("uTexture", "samplerCube");
    shader.prepareUniform("uProjMatrix", "mat4");
	shader.prepareUniform("uCameraMatrix", "mat4");
    shader.prepareUniform("uMVMatrix", "mat4");

    shader.bind();
    shader.setUniforms("uTexture", tex);



    shader.texture = tex;
    let cube = ecs.newEntity("Skybox", ["Drawable", "Transform"]);
    cube.com.Drawable.vao = FacedCube.vao();
    cube.com.Drawable.shader = shader;
    cube.com.Transform.setPosition(0,0,0);
    cube.com.Transform._scale = new Vec3(100,100,100);

    cube.com.Drawable.customDrawFunction = function(e){
    	e.com.Drawable.shader.bind();

        e.com.Drawable.shader.setUniforms("uTexture", e.com.Drawable.shader.texture);

        let translateless = new Float32Array(Core.camera.com.Camera.invertedWorldMatrix);
        translateless[12] = translateless[13] = translateless[14] = 0.0;


        e.com.Drawable.shader.setUniform("uCameraMatrix", translateless);
        e.com.Drawable.shader.setUniform("uProjMatrix", Core.camera.com.Camera.projectionMatrix);
        e.com.Drawable.shader.setUniform("uMVMatrix", e.com.Transform.modelMatrix);

        GL.ctx.disable(GL.ctx.CULL_FACE);
        GL.ctx.bindVertexArray(e.com.Drawable.vao.id);
        GL.ctx.drawElements(GL.ctx.TRIANGLES, e.com.Drawable.vao.elmCount, GL.ctx.UNSIGNED_SHORT, 0);
        GL.ctx.enable(GL.ctx.CULL_FACE);
        GL.ctx.bindVertexArray(null);

    }


}

export default initSkybox;