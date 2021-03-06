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

import CurveSurfaceIntersection from "../Modules/Geometry/Intersections.js";



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
        // bezier.addSpline(200, 8, 2);

        

        // let ruled = this.Geometry.createTwoCurveBase(5, 1, 0, 0).disableBoundaryCurves();
        // // coons.fixY();
        // ruled.addSpline(200, 200, 5, 2).setColor("#00a328").disableBrokenLines();

        // let laplace = this.Geometry.createFourCurveBase(5, 1, 0, 0).disableBoundaryCurves();
        // laplace.fixY();
        // laplace.addSpline(50,50, 6, 4).setColor("#22d319").disableBrokenLines();

        // let coons = this.Geometry.createFourCurveBase(5, 1, 7, 0).disableBoundaryCurves();
        // coons.fixY();
        // coons.addSpline(50, 50, 4, 4).setColor('#22d319').disableBrokenLines();

        // let deformation = this.Geometry.createFourCurveBase(5, 1, 0, 0).disableBoundaryCurves();
        // deformation.fixY();
        // deformation.addSpline(50, 50, 10, 4).setColor("#22d319").disableBrokenLines();
        // deformation.spline.surfaceBase.deformationGridGenerator.changeCoeff(0.9);

        // let deformation1 = this.Geometry.createFourCurveBase(5, 1, 7, 0).disableBoundaryCurves();
        // deformation1.fixY();
        // deformation1.addSpline(50, 50, 10, 4).setColor("#22d319").disableBrokenLines();
        // deformation1.spline.surfaceBase.deformationGridGenerator.changeCoeff(0.1);

        // let surface = this.Geometry.createSurface(7, 7, 0.5, 0.5 , 0, 0, (x,z)=> Math.sin(x)*Math.sin(z));
        // surface.addSpline(50, 50, 3, 2).setColor('#b70138').disableBrokenLines();

        let surface = this.Geometry.createFourCurveBase(8, 1, 0, 0).disableBoundaryCurves();
        surface.addSpline(50, 50, 4, 2).setColor('#22d319').disableBrokenLines();

    

        let curve = this.Geometry.createCurve(10, 1, -0.5, -1, (x)=> 4*Math.cos(1.5*x)+1).disableBrokenLine();
        curve.addSpline(200, 3, 2);

        let curveBase   = curve.spline.curveBase;
        let surfaceBase = surface.spline.surfaceBase;

        let a = CurveSurfaceIntersection(curve.spline.curveBase, surface.spline.surfaceBase);
        console.log(a);

        for(let i = 0; i < a.length; i++){
            this.Geometry.addPoint(a[i].x, a[i].y, a[i].z, "#0400fc");
        }


        // this.Geometry.addPoint(...surfaceBase.getCoord(0, 0), "#0400fc");
        // this.Geometry.addPoint(...surfaceBase.getCoord(0.5, 0.5), "#0400fc");
        // this.Geometry.addPoint(...surfaceBase.getCoord(1, 1), "#0400fc");
        // this.Geometry.addPoint(...surfaceBase.getCoord(1, 0), "#0400fc");
        // this.Geometry.addPoint(...surfaceBase.getCoord(0, 1), "#0400fc");
        // this.Geometry.addPoint(...surfaceBase.getCoord(0.25, 0.25), "#0400fc");
        // this.Geometry.addPoint(...surfaceBase.getCoord(0.75, 0.75), "#0400fc");

        // this.Geometry.addPoint(...curveBase.getCoord(0), "#0400fc");
        // this.Geometry.addPoint(...curveBase.getCoord(1), "#0400fc");
        // this.Geometry.addPoint(...curveBase.getCoord(0.5), "#0400fc");

        

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