import Core               from "../../core.js";
import { Components }     from "../../ECS.js";
import { PointCollection, Point } from "./PointCollection.js";
import { Quat, Vec3 }	from "../../Maths.js";


class Animation{
	constructor(){
		this.idCnt  = 0;
		this.points = [];
		this.references = [];
	}

	static addPointAnimation(storage, point, func){
		if(point.animationID) console.error("This point is animated");
		point.animationID = storage.idCnt;
		storage.idCnt++;

		for(let i=1; i<point.references.length; i++){
			let ID = point.references[i].refID;

			let found = false;

			for(let j=0; j<storage.references.length; j++){
				if( storage.references[j].ID == ID ) {
					found = true; break;
				}
			}
			if(!found) storage.references.push({callback: point.references[i].callback, ID: ID});
		}
		storage.points.push({point: point, function: func});
	}
} Components(Animation);


const QUERY_COM = ["Animation"];

class AnimationSystem{
	constructor(){}

	update(ecs){
		let e, ary = ecs.queryEntities( QUERY_COM );
		for( e of ary ){
			//////////////////////////////////////////////////////////
			let points = e.com.Animation.points;
			let refs   = e.com.Animation.references;

			for(let i=0; i<points.length; i++){
				points[i].function(points[i].point, Core.sinceStart);
				points[i].point.references[0].callback(points[i].point);
			}
			//////////////////////////////////////////////////////////
			for(let i=0; i<refs.length; i++) refs[i].callback();
		}
	}

}

export default AnimationSystem;

export { Animation };