import SurfaceBase from "./SurfaceBase.js";

class RuledSurface extends SurfaceBase{
	constructor(pointAry, surfSizeX, surfSizeZ, splinePointsX, splinePointsZ, c1, c2){
		super(pointAry, surfSizeX, surfSizeZ, splinePointsX, splinePointsZ);
		this.c1points = c1;
		this.c2points = c2;
	}

	build(){
		let verts = [];

		let step_t   = 1 / (this.splinePointsZ-1);
		let step_tau = 1 / (this.splinePointsX-1);


		let c1_Ary = this.c1points.spline.curveBase.build();
		let c2_Ary = this.c2points.spline.curveBase.build();

		for(let stpT=0; stpT<this.splinePointsZ; stpT++){
			let c1t = c1_Ary[stpT];
			let c2t = c2_Ary[stpT];
			for(let stpTau=0; stpTau<this.splinePointsX; stpTau++){
				let r_x = (1-stpTau*step_tau)*c1t[0]+stpTau*step_tau*c2t[0];
				let r_y = (1-stpTau*step_tau)*c1t[1]+stpTau*step_tau*c2t[1];
				let r_z = (1-stpTau*step_tau)*c1t[2]+stpTau*step_tau*c2t[2];
				verts.push(r_x, r_y, r_z);
			}
		}

		return verts;
	}
}

export default RuledSurface;