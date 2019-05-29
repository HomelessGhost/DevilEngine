import CurveBase from "./CurveBase.js";
import Vec3      from "../../../maths/Vec3.js"

class DistanceCurve extends CurveBase{
	constructor(pointAry, splinePointsCount){
		super(pointAry, splinePointsCount);
	}

	build(){
		let verts = [];

		let lines = this.pointAry.length - 1;
		let tAry = [];
		let t_max = 0;
		tAry.push(0);
		for(let i = 0; i < lines; i++){
			t_max += Vec3.sub(this.pointAry[i].position, this.pointAry[i+1].position).length();
			tAry.push(t_max);
		}

		let t_i = 0;
		let cur_ind = 0;
		let step = t_max / (this.splinePointsCount - 1);

		for(var t = 0; t < t_max; t+=step){
			let p_i  = new Vec3().copy(this.pointAry[cur_ind].position);
			let p_ii = new Vec3().copy(this.pointAry[cur_ind+1].position);

			let point = Vec3.add(Vec3.scale(p_i, 1 - (t-t_i)/(tAry[cur_ind+1]-tAry[cur_ind]) ) , Vec3.scale(p_ii, (t-t_i)/(tAry[cur_ind+1]-tAry[cur_ind]) ));

			verts.push( point );

			if(t + step > tAry[cur_ind+1]){
				t_i = tAry[cur_ind+1];
				cur_ind++;
			} 
		}

		return verts;
	}
}

export default DistanceCurve;