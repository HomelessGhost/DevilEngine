import CurveBase from "./CurveBase.js";
import Vec3      from "../../../maths/Vec3.js";

class HermiteCurve extends CurveBase{
	constructor(pointAry, splinePointsCount, tangentLines){
		super(pointAry, splinePointsCount);

		this.tangentLines = tangentLines;
	}

	build(){
		let verts = [];

		let points = this.pointAry;
		if(points.length<4 || points.length%2 !== 0) return this;
		let t_Ary = new Array(points.length/2);
		let m_Ary = new Array(points.length/2);
		t_Ary[0] = 0.0;
		for(let i=2; i<points.length; i+=2) t_Ary[i/2] = t_Ary[i/2-1] + Vec3.sub(points[i].position, points[i-2].position).length();
		for(let i=0; i<points.length; i+=2) m_Ary[i/2] = Vec3.sub(points[i+1].position, points[i].position);

		let step_t = t_Ary[t_Ary.length-1] / (this.splinePointsCount-1);


		let i = 0;

		for(let stpT=0; stpT<this.splinePointsCount; stpT++){
			let t = stpT*step_t;
			
			let h_i = t_Ary[i+1]-t_Ary[i];
			let w = (t-t_Ary[i])/h_i;

			let fi1 = (1-w)*(1-w)*(1+2*w);
			let fi2 = w*w*(3-2*w);
			let fi3 = w*(1-w)*(1-w);
			let fi4 = -w*w*(1-w);

			let x = fi1*points[i*2].position[0] + fi2*points[(i+1)*2].position[0] + fi3*h_i*m_Ary[i][0] + fi4*h_i*m_Ary[i+1][0];
			let y = fi1*points[i*2].position[1] + fi2*points[(i+1)*2].position[1] + fi3*h_i*m_Ary[i][1] + fi4*h_i*m_Ary[i+1][1];
			let z = fi1*points[i*2].position[2] + fi2*points[(i+1)*2].position[2] + fi3*h_i*m_Ary[i][2] + fi4*h_i*m_Ary[i+1][2];

			verts.push( [x, y, z] );
			if( stpT!==this.splinePointsCount-1 && (stpT+1)*step_t > t_Ary[i+1]+0.0001 ){
				i++;
			}
		}

		this.tangentLines.setLines(points);
		return verts;
	}
}

export default HermiteCurve;