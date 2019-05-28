import Scene from "./Scene.js";
import Core  from "../core.js";
import FacedCube from "../Primitives/FacedCube.js";
import GridFloor from "../Primitives/GridFloor.js";
import GL        from "../gl.js";
import initSkybox from "../Skybox.js";
import ECS, { Components, Assemblages, Entity, System }  from "../ECS.js";

import Camera       from "../Components/Camera.js";
import Move         from "../Components/Move.js";
import Transform    from "../Components/Transform.js";
import Drawable     from "../Components/Drawable.js";

import CameraSystem    from "../Systems/CameraSystem.js";
import RenderSystem    from "../Systems/RenderSystem.js";
import TransformSystem from "../Systems/TransformSystem.js";
import MoveSystem      from "../Systems/MoveSystem.js";


import { Material } from "../Shader.js";
import Shader       from "../Shader.js";
import { BaseLight, DirectionalLight, PointLight, Attenuation } from "../Light.js";

import loadShaderResource from "../garbageFuncs.js";

import Geometry           from "../Modules/Geometry/GeometryModule.js";



class TestScene extends Scene{
    constructor(){
        super();

        loadShaderResource('./Shaders/facedCube.vs', 'cube_v');
        loadShaderResource('./Shaders/facedCube.fs', 'cube_f');
        let tex = GL.loadTexture("leather", document.getElementById("leather"));
        let tex2 = GL.loadTexture("leather", document.getElementById("carpet"));

        this.camera = this.ECS.newEntity("Camera", ["Camera", "Transform"]);
        this.camera.com.Transform.setPosition(0,2,2);
        Camera.setProjection(this.camera.com.Camera);

        this.ECS.addSystem(new RenderSystem(), 50);
        this.ECS.addSystem(new CameraSystem(), 25);
        this.ECS.addSystem(new TransformSystem(), 20);
        this.ECS.addSystem(new MoveSystem(), 19);

        

 //      initSkybox(this.ECS);

        // this.initGridFloor();
     

        this.Geometry = new Geometry(this.ECS);


        let phongShader = Core.mShaderProgs.get("PhongSurface");
        let dirLight = new DirectionalLight(new BaseLight( [1.0,1.0,1.0], 1.0), [0, 1.0,0]);

        phongShader.bind();
        phongShader.setDirectionalLight(dirLight);
        phongShader.setUniform("baseColor", [85/255,7/255,109/255]);
        phongShader.setUniform("specularIntensity", 2.0);
        phongShader.setUniform("specularPower", 100.0);
        phongShader.setUniform("ambientLight", [0.2, 0.2, 0.2]);




        // let elliptic = this.Geometry.createFourCurveBase(5, 1, -30, 0).disableBoundaryCurves();
        // elliptic.fixY();
        // elliptic.addSpline(50, 50, 7, 2).setColor("#b70138").disableBrokenLines();

        // let bezier = this.Geometry.createCurve(10, 1, 0, 0);
        // bezier.addSpline(200, 5, 2);

        let coons = this.Geometry.createFourCurveBase(5, 1, 0, 10).disableBoundaryCurves();
        coons.fixY();
        coons.addSpline(50, 50, 4, 4).setColor("#00a328").disableBrokenLines();

        // let laplace = this.Geometry.createFourCurveBase(5, 1, 0, 0).disableBoundaryCurves();
        // laplace.fixY();
        // laplace.addSpline(25,25, 6, 4).setColor("#b70138").disableBrokenLines();

        // let deformation = this.Geometry.createFourCurveBase(5, 1, 0, 0).disableBoundaryCurves();
        // deformation.fixY();
        // deformation.poisson_coeff = 0.3;
        // deformation.addSpline(50, 50, 10, 2).setColor("#b70138").disableBrokenLines();

        // let deformation1 = this.Geometry.createFourCurveBase(5, 1, -7, 0).disableBoundaryCurves();
        // deformation1.fixY();
        // deformation1.poisson_coeff = 0.9;
        // deformation1.addSpline(50, 50, 10, 2).setColor("#b70138").disableBrokenLines();

        // let natural = this.Geometry.createCurve(10, 1, 15, 0);
        // natural.addSpline(200, 8, 2);

        // let bicubic = this.Geometry.createSurface(7, 7, 0.5, 0.5 , 0, 0, (x,z)=> Math.sin(x)*Math.sin(z));
        // bicubic.addSpline(200, 200, 8, 2).setColor('#dd0b6d').disableBrokenLines();

        // let bicubic2 = this.Geometry.createSurface(7, 7, 0.5, 0.5 , 20, 15, (x,z)=> x*x/4 + z*z/4 );
        // bicubic2.addSpline(200, 200, 8, 2).setColor("#087026").disableBrokenLines().setTexture(tex);
    }



    initGridFloor(){
        let gridFloor = this.ECS.newEntity("GridFloor", ["Drawable", "Transform"]);
        gridFloor.com.Transform.setPosition(0,0,0);
        gridFloor.com.Drawable.drawMode = Core.gl.LINES;
        gridFloor.com.Drawable.vao = GridFloor.vao();

        let matGridFloor = new Material("m002");
        matGridFloor.shader = Core.mShaderProgs.get("m001");
        matGridFloor.options = { "depthTest":true, "blend":false };
        matGridFloor.addUniform("u_colorAry", "rgb", ["555555","bb5555","118811"]);
        gridFloor.com.Drawable.material = matGridFloor;
    }
}



export default TestScene;