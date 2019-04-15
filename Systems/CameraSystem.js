import Core	     		from "../core.js";
import { Quat, Vec3 }	from "../Maths.js";
import { System }		from "../ECS.js";
import Api 				from "../Api.js";

const LOOK_RATE 		= 0.002;
const ORBIT_RATE		= 0.003;
const PAN_RATE			= 0.008;
const KB_FORWARD_RATE	= -0.1;
const KB_ROTATE_RATE	= 0.04;

const FRAME_LIMIT		= 1;

class CameraSystem extends System{
	constructor(){
		super();

		this.isActive	= false;	//
		this.mode		= 1;		//Which Mouse Mode to use
		this.state_c	= false;	//State of the C button
		this.wheelChg	= null;

		//Keep track of inital state for mode
		this.initRotation = new Quat();	
		this.initPosition = new Vec3();

		//Track last mouse change, so if no change, dont handle mouse movements
		this.lastYChange = 0;
		this.lastXChange = 0;
	}


	update(ecs){
		//............................................
		//Handle Keyboard Input
		if(Core.input.keyCount > 0) this.handleKeyboard();


		//............................................
		//Handle Mouse Wheel Change
		if(Core.input.wheelUpdateOn !== this.wheelChg){
			this.wheelChg = Core.input.wheelUpdateOn;

			let t = Core.camera.com.Transform,
				cc = (Core.input.isCtrl())? 5 : 1;

			t.position = Api.getLocalForward(Core.camera, null, KB_FORWARD_RATE * Core.input.wheelValue * cc)
				.add( t._position );
		}


		//............................................
		//Has mouse movement started, if so which mode to be in
		if(!Core.input.rightMouse){  //if(!Core.input.isMouseActive){
			this.isActive = false;		
			return;	
		}else if(!this.isActive){
			this.isActive = true;
			this.initRotation.copy( Core.camera.com.Transform._rotation );
			this.initPosition.copy( Core.camera.com.Transform._position );

			if(Core.input.keyState[16] === true)		this.mode = 0; // Shift - Pan Mode
			else if(Core.input.keyState[17] === true)	this.mode = 2; // Ctrl - Orbit Mode
			else 										this.mode = 1; // Look
		}


		//............................................
		//Only handle mouse Movements if there was a change since last frame.
		if(	this.lastYChange !== Core.input.coord.idy ||
			this.lastXChange !== Core.input.coord.idx ) this.handleMouse();

		this.lastYChange = Core.input.coord.idy;
		this.lastXChange = Core.input.coord.idx;
	}


	handleMouse(){
		let t = Core.camera.com.Transform,
			c = Core.input.coord;

		switch(this.mode){
			//------------------------------------ LOOK
			case 1:
				//Quaternion Way
				//var pos = Core.camera.getPosition()
				//			.add( Core.camera.left(null, c.pdx * this.mLookRate) )
				//			.add( Core.camera.up(null, c.pdy * -this.mLookRate) )
				//			.add( Core.camera.forward() )
				//			.sub( Core.camera.getPosition() );

				//Works just as good without local position as a starting point then 
				//subtracting it to make a Direction vector
				//var pos = Core.camera.left(null, c.pdx * this.mLookRate)
				//			.add( Core.camera.up(null, c.pdy * -this.mLookRate) )
				//			.add( Core.camera.forward() );
				//Core.camera.rotation = Quat.lookRotation(pos, Vec3.UP);

				//Euler Way
				let euler = Quat.toEuler(this.initRotation);
				euler[0] -= c.idy * LOOK_RATE;
				euler[1] -= c.idx * LOOK_RATE;

				t.rotation = Quat.fromEuler(null, euler[0], euler[1], 0, "YZX");
			break;
			//------------------------------------ Orbit
			case 2:
				//Rotate the camera around X-Z
				let pos		= this.initPosition.clone(),
					lenXZ	= Math.sqrt(pos.x*pos.x + pos.z*pos.z),
					radXZ	= Math.atan2(pos.z, pos.x) + ORBIT_RATE * c.idx;

				pos[0]	= Math.cos(radXZ) * lenXZ;
				pos[2]	= Math.sin(radXZ) * lenXZ;

				//Then Rotate point around the the left axis
				let q = new Quat().setAxisAngle( Api.getLocalLeft(Core.camera) , -c.idy * ORBIT_RATE);
				Quat.rotateVec3(q, pos, pos);

				//Save New Position, then update rotation
				t.position	= pos;
				t.rotation	= Quat.lookRotation(pos, Vec3.UP);
			break;
			//------------------------------------ Panning
			default:
				t.position = new Vec3()
					.add( Api.getLocalUp(	Core.camera, null, PAN_RATE * c.idy) )		// Up-Down
					.add( Api.getLocalLeft(	Core.camera, null, PAN_RATE * -c.idx) )	// Left-Right
					.add( this.initPosition );											// Add Change to Inital Position
			break;
		}
	}


	handleKeyboard(){
		let key	= Core.input.keyState,
			t	= Core.camera.com.Transform,
			ss	= (Core.input.isShift())? 5.0 : 1.0;

		//.......................................
		//C - Output Camera Position and Rotation
		//Only do operation on Key Up.
		if(!key[67] && this.state_c){
			this.state_c = false;

			let axis = t._rotation.getAxisAngle();
			console.log(".setPosition(%f, %f, %f)\n.setAxisAngle([%f,%f,%f], %f);", 
				t._position.x,t._position.y, t._position.z,
				axis[0], axis[1], axis[2], axis[3]
			);
			console.log("Camera Length: %f", t._position.length());
		}else if(key[67] && !this.state_c) this.state_c = true;

		//..................................... Forward / Backwards
		 // w - s
		if(key[87] || key[83]){
			let s = (key[87])? KB_FORWARD_RATE : -KB_FORWARD_RATE;
			
			//(key[87]) ? Core.camera.com.Move.acceleration[0] = 30 : Core.camera.com.Move.acceleration[0] = -30;
			t.position = Api.getLocalForward(Core.camera, null, s * ss).add( t._position );
		}

		//..................................... Left / Right
		// A - D
		if(key[65] || key[68]){
			 let s = (key[68])? -KB_FORWARD_RATE : KB_FORWARD_RATE;
			 t.position = Api.getLocalLeft(Core.camera, null, s * ss).add( t._position );
			//(key[68]) ? Core.camera.com.Move.acceleration[1] = 30 : Core.camera.com.Move.acceleration[1] = -30;
		}

		//..................................... Left / Right
		// Q - E
		if(key[81] || key[69]){
			let s = (key[69])? -KB_ROTATE_RATE : KB_ROTATE_RATE;

			Quat.mulAxisAngle(t._rotation, Vec3.UP, s * ss); //Modifies t._rotation, need to set isModified
			t._isModified = true;
		}
	}
}


export default CameraSystem;