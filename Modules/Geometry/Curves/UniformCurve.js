import CurveBase from "./CurveBase.js";
import Vec3      from "../../../maths/Vec3.js"

class UniformCurve extends CurveBase{
	constructor(pointAry, splinePointsCount){
		super(pointAry, splinePointsCount);
	}

	build(){
		let verts = [];

		let t_max = this.pointAry.length - 1;;
		let step  = t_max / this.splinePointsCount;
		for(let t = 0; t < t_max; t+=step){
			let t_i = Math.floor(t);
			let p_i  = new Vec3().copy(this.pointAry[t_i].position);
			let p_ii = new Vec3().copy(this.pointAry[t_i+1].position);

			let point = Vec3.add(Vec3.scale(p_i,  1 - (t-t_i) ) , Vec3.scale(p_ii, t-t_i ));

			verts.push( point );
		}

		return verts;
	}
}

export default UniformCurve;