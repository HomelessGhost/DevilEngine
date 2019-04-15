import { System } from "../ECS.js";
import Maths, { Vec3, Quat, Mat4 }	from "../Maths.js";
import Api 				from "../Api.js";
import Core             from "../core.js";

const QUERY_COM = ["Transform", "Move"];

class MoveSystem extends System{
	constructor(){ super(); }

	update(ecs){
		let t, e, ary = ecs.queryEntities( QUERY_COM );
		for( e of ary ){

			let move      = e.com.Move;
			let transform = e.com.Transform;

	
			let up      = Api.getLocalUp(e);
			let forward = Api.getLocalForward(e);
			let left    = Api.getLocalLeft(e);

			let moved = false;


			////////////////////////////////////////////////////
			// Движение_____________________________________________________________________________________
			if(move.velocity[0] !== 0) {
				moved = true;
				transform._position[0] -= forward[0] * move.velocity[0] * Core.deltaTime;
				transform._position[1] -= forward[1] * move.velocity[0] * Core.deltaTime;
				transform._position[2] -= forward[2] * move.velocity[0] * Core.deltaTime;
			}
			if(move.velocity[1] !== 0) {
				moved = true;
				transform._position[0] += left[0] * move.velocity[1] * Core.deltaTime;
				transform._position[1] += left[1] * move.velocity[1] * Core.deltaTime;
				transform._position[2] += left[2] * move.velocity[1] * Core.deltaTime;
			}
			if(move.velocity[2] !== 0) {
				moved = true;
				transform._position[0] += up[0] * move.velocity[2] * Core.deltaTime;
				transform._position[1] += up[1] * move.velocity[2] * Core.deltaTime;
				transform._position[2] += up[2] * move.velocity[2] * Core.deltaTime;
			}
			move.resistance[0] = move.resistCoeff * move.velocity[0];
			move.resistance[1] = move.resistCoeff * move.velocity[1];
			move.resistance[2] = move.resistCoeff * move.velocity[2];

			move.velocity[0] += (move.acceleration[0] - move.resistance[0]) * Core.deltaTime;
			move.velocity[1] += (move.acceleration[1] - move.resistance[1]) * Core.deltaTime;
			move.velocity[2] += (move.acceleration[2] - move.resistance[2]) * Core.deltaTime;

			if(move.acceleration[0] === 0 && move.acceleration[1] === 0 && move.acceleration[2] === 0
				&& Math.abs(move.velocity[0]) < move.epsilon && Math.abs(move.velocity[1]) < move.epsilon && Math.abs(move.velocity[2]) < move.epsilon) {
				move.velocity[0] = 0;
				move.velocity[1] = 0;
				move.velocity[2] = 0;
			}
			////////////////////////////////////////////////////
			move.acceleration[0] = move.acceleration[1] = move.acceleration[2] = 0;
			transform._isModified = moved;
		}
	}

}

export default MoveSystem;