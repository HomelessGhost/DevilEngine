import Core	     		from "../../core.js";
import { Quat, Vec3 }	from "../../Maths.js";
import { System }		from "../../ECS.js";
import Api 				from "../../Api.js";
import GL               from "../../gl.js";
import FBO, { FBO_2 }   from "../../FBO.js";

const QUERY_COM = ["PointCollection"];

class PickingSystem extends System{
	constructor(geometry){
		super();

		this.isActive	= false;
		this.wheelChg	= null;

		this.geometry = geometry;

		//Track last mouse change, so if no change, dont handle mouse movements
		this.lastYChange = 0;
		this.lastXChange = 0;

		this.target = null;

		this.deltaCounter = 0;

		this.initPos = new Vec3();
		this.tmpPos = new Vec3();

		this.visibleSwitcherActive = false;
	}


	update(ecs){
		let t, e, ary = ecs.queryEntities( QUERY_COM );
		for( e of ary ){
			let collection = e.com.PointCollection;

			if(Core.input.isShift() && Core.input.key(70)) {
				if(!this.visibleSwitcherActive){
					this.geometry._points.active = !this.geometry._points.active;
					this.visibleSwitcherActive = true;
				}
			} else {
				this.visibleSwitcherActive = false;
			}

			if(!Core.input.leftMouse){  //if(!Core.input.isMouseActive){
				this.isActive = false;
				this.target   = null;		
				return;	
			} else if(!this.isActive){
	
				let x = Core.input.coord.x;
				let y = Core.input.coord.y;

				let yi		= GL.height - y; //Gotta flip the y
				let pixel	= FBO_2.readPixel(Core.fboFinal,x,yi,1);
				let id		= this.colorToID(pixel);

				if(id == 0 || id == 16777215) return; //ignore Black and white.
				this.target = this.find(id, collection);
				if(this.target) this.isActive = true;
				if(!this.target) return;
				this.initPos.copy(this.target.position);
			}

			//............................................
			//Only handle mouse Movements if there was a change since last frame.
			if(	this.lastYChange !== Core.input.coord.idy ||
				this.lastXChange !== Core.input.coord.idx ) this.handleMouse();

			this.lastYChange = Core.input.coord.idy;
			this.lastXChange = Core.input.coord.idx;
		}
	}

	colorToID(a){ return a[0] | (a[1] << 8) | (a[2] << 16); }
	idToColor(v){ //With 3 bytes, the max value is 16777215;
		let a = new Float32Array(3);
		a[0] = (v & 0xff) / 255.0;
		a[1] = ((v & 0xff00) >> 8) / 255.0;
		a[2] = ((v & 0xff0000) >> 16) / 255.0;
		return a;
	}
	find(id, collection){
		for(let i=0; i < collection.points.length; i++){
			if(collection.points[i].id == id) return collection.points[i];
		}
		return null;
	}


	handleMouse(){
		let v  = [0,0,0],
 			dx = Core.input.coord.x-Core.input.coord.ix,
 			dy = Core.input.coord.y-Core.input.coord.iy;

 		this.tmpPos.copy(this.initPos);

 		let distanceToPoint = null;
 		distanceToPoint= Vec3.sub(this.initPos, Core.camera.com.Transform._position, distanceToPoint).length();

 		let up      = Api.getLocalUp(Core.camera);
		let left    = Api.getLocalLeft(Core.camera);


 		if(!this.target.xFixed) this.tmpPos[0] += left[0] * dx * 0.001 * distanceToPoint;
 		if(!this.target.yFixed) this.tmpPos[1] += left[1] * dx * 0.001 * distanceToPoint;
 		if(!this.target.zFixed) this.tmpPos[2] += left[2] * dx * 0.001 * distanceToPoint;
		
 		if(!this.target.xFixed) this.tmpPos[0] -= up[0] * dy * 0.001 * distanceToPoint;
 		if(!this.target.yFixed) this.tmpPos[1] -= up[1] * dy * 0.001 * distanceToPoint;
 		if(!this.target.zFixed) this.tmpPos[2] -= up[2] * dy * 0.001 * distanceToPoint;


 		this.target.position.copy(this.tmpPos);
 		for(let i=0; i<this.target.references.length; i++){
 			this.target.references[i].callback(this.target);	
 		}
	}
}


export default PickingSystem;