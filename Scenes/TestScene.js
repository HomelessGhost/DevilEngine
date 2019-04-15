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
        Camera.setProjection(this.camera.com.Camera);

        this.ECS.addSystem(new RenderSystem(), 50);
        this.ECS.addSystem(new CameraSystem(), 25);
        this.ECS.addSystem(new TransformSystem(), 20);
        this.ECS.addSystem(new MoveSystem(), 19);
        

        // let cube = this.ECS.newEntity("Cube", ["Drawable", "Transform"]);

        // cube.com.Drawable.vao = FacedCube.vao();
        // cube.com.Transform.setPosition(0,0,-10);

        


        // let shader   = new Shader("m001", Core.shadersSrc.get("cube_v"), Core.shadersSrc.get("cube_f")  );
        // let material = new Material("m001");

        // cube.com.Drawable.material = material;
        // cube.active = false;
        // cube.com.Drawable.drawMode = Core.gl.TRIANGLES;
        // material.shader = shader;

        // material.options = { "depthTest":true, "blend":false };

        // shader.prepareUniformBlock("UBOTransform");
        // shader.prepareUniformBlock("UBOModel");
        // shader.setOptions(true);

        this.camera.com.Transform.setPosition(0,2,2);

        initSkybox(this.ECS);

 //      this.initGridFloor();
       // shader.prepareUniform("u_colorAry", "vec3");
       // material.addUniform("u_colorAry", "rgb", ["ff0000","00ff00","0000ff","555555","999999","dddddd","000000","ff7f7f","ff8c00","ffff00"]);

        this.Geometry = new Geometry(this.ECS);


        let phongShader = Core.mShaderProgs.get("PhongSurface");
        let dirLight = new DirectionalLight(new BaseLight( [1.0,1.0,1.0], 1.0), [0, 1.0,0]);

        phongShader.bind();
        phongShader.setDirectionalLight(dirLight);
        phongShader.setUniform("baseColor", [85/255,7/255,109/255]);
        phongShader.setUniform("specularIntensity", 2.0);
        phongShader.setUniform("specularPower", 100.0);
        phongShader.setUniform("ambientLight", [0.2, 0.2, 0.2]);


        let surface2 = this.Geometry.createSurface(20, 20, 2, 2, -20, 20, function(x, z){ return 2*Math.sin(x/2)*Math.cos(z/2)+4; });
        surface2.addSpline(100, 100, 2, 3).setColor("#087026");


        let tcb = this.Geometry.createFourCurveBase(5, 1, 0, 0);
        tcb.addSpline(50, 50, 4, 3).setColor("#b70138").disableBoundaryCurves().disableBrokenLines().setTexture(tex2);

        let tcb1 = this.Geometry.createTwoCurveBase(5, 1, 10,0);
        tcb1.addSpline(50, 50, 5, 3).setColor("#b70138").disableBrokenLines().disableBoundaryCurves();
        

        let startPos1 = tcb.c1points.controlPoints[0].position[1];
        let startPos2 = tcb.c1points.controlPoints[ tcb.c1points.controlPoints.length-1 ].position[1];
        let startPos3 = tcb.c1points.controlPoints[ 2 ].position[1];

        let startPos4 = tcb.c4points.controlPoints[ 2 ].position[1];


        this.Geometry.addAnimation(tcb.c1points.controlPoints[0], (p, t)=> {
            p.position[1] = startPos1 + Math.sin(t);
        });

        this.Geometry.addAnimation(tcb.c1points.controlPoints[ tcb.c1points.controlPoints.length-1 ], (p, t)=> {
            p.position[1] = startPos2 + Math.sin(t);
        });

        this.Geometry.addAnimation(tcb.c1points.controlPoints[ 2 ], (p, t)=> {
            p.position[1] = startPos3 + Math.cos(t);
        });

        this.Geometry.addAnimation(tcb.c2points.controlPoints[ 2 ], (p, t)=> {
            p.position[1] = startPos4 + Math.sin(t);
        });

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