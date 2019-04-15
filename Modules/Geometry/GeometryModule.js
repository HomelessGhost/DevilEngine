import { PointCollection, Point } from "./PointCollection.js";
import PickingSystem              from "./PickingSystem.js";
import AnimationSystem, {Animation} from "./Animation.js";
import Transform                  from "../../Components/Transform.js";
import Drawable                   from "../../Components/Drawable.js";

import { Material } from "../../Shader.js";
import Shader       from "../../Shader.js";
import Core         from "../../core.js";

import BrokenLine, { brokenLineDrawFunction, BrokenLineStorage  }   from "./BrokenLine.js";
import Surface, { SurfaceStorage, surfaceDrawFunction, TwoCurveBase, FourCurveBase }             from "./Surface.js";
import DebugObject, { DebugObjectStorage, debugObjectDrawFunction } from "./DebugObject.js";
import Curve, { CurveStorage, curveDrawFunction }                   from "./Curve.js"; 

class GeometryModule{
	constructor(ecs){
		this.ECS = ecs;

		this.objects = {};
		
		this.ECS.addSystem(new PickingSystem(this), 24);
		this.ECS.addSystem(new AnimationSystem(), 23);

		this.brokenLineCount = 0;
		this.surfaceBaseCount = 0;

		// Setting up point storage
		this._points = this.ECS.newEntity("PointCollection", ["Drawable","Transform", "PointCollection"]);
        this._points.com.Drawable.vao = this._points.com.PointCollection.vao.vao;
        this._points.com.Drawable.drawMode = Core.gl.POINTS;
        let pointMaterial =  new Material("PointMaterial");
        pointMaterial.shader = this._points.com.PointCollection.shader;
        pointMaterial.options = { "depthTest":true, "blend":false };
        pointMaterial.shader.prepareUniformBlock("UBOTransform");
        this._points.com.Drawable.material = pointMaterial;
        this.pointCollection = this._points.com.PointCollection;

        // Setting up broken line storage
        this._brokenLines = this.ECS.newEntity("BrokenLineStorage", ["Drawable","Transform", "BrokenLineStorage"]);
        this._brokenLines.com.Drawable.customDrawFunction = brokenLineDrawFunction;
        this._brokenLines.com.BrokenLineStorage.vao = this._points.com.Drawable.vao;
        this.brokenLineStorage = this._brokenLines.com.BrokenLineStorage;

        // Setting up surface storage
        this._surfaces = this.ECS.newEntity("SurfaceStorage", ["Drawable","Transform", "SurfaceStorage"]);
        this._surfaces.com.Drawable.customDrawFunction = surfaceDrawFunction;
        this.surfaceStorage = this._surfaces.com.SurfaceStorage;

        // Setting up debug object storage
        this._debugObjects = this.ECS.newEntity("DebugObjectStorage", ["Drawable","Transform", "DebugObjectStorage"]);
        this._debugObjects.com.Drawable.customDrawFunction = debugObjectDrawFunction;
        this.debugObjectStorage = this._debugObjects.com.DebugObjectStorage;

        // Setting up curve storage
        this._curves = this.ECS.newEntity("CurveStorage", ["Drawable","Transform", "CurveStorage"]);
        this._curves.com.Drawable.customDrawFunction = curveDrawFunction;
        this.curveStorage = this._curves.com.CurveStorage;

        // Setting up animation
        this._animation = this.ECS.newEntity("CurveStorage", ["Animation"]);
        this.animationCom =  this._animation.com.Animation;

        this._refID = 0;

	}
        _getRefID(){ return this._refID++; };

	addPoint(x, y, z, cHex){ PointCollection.addPoint(this.pointCollection, new Point(x,y,z,cHex)); }
	addAnimation(point, func) { Animation.addPointAnimation(this.animationCom, point, func);  }

	createPoint(x, y, z, cHex) { let point = new Point(x,y,z,cHex); PointCollection.addPoint(this.pointCollection, point); return point; } 
	createBrokenLine(){ return new BrokenLine(this); }
	createSurface(sX, sZ, dX, dZ, oX, oZ, func){ return new Surface(this, sX, sZ, dX, dZ, oX, oZ, func); }
	createCurve(sX, dX, oX, oZ, func){ return new Curve(this, sX, dX, oX, oZ, func); }
	createTwoCurveBase(size, density, oX, oZ){ return new TwoCurveBase(this, size, density, oX, oZ); }
	createFourCurveBase(size, density, oX, oZ){ return new FourCurveBase(this, size, density, oX, oZ); }
        disablePoints(){ this._points.active = false; }
        enablePoints(){ this._points.active = true; }




}

export default GeometryModule;
