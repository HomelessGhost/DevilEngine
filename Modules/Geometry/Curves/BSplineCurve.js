import CurveBase from "./CurveBase.js";

class BSplineCurve extends CurveBase{
	constructor(pointAry, splinePointsCount, q, bSplineType){
		super(pointAry, splinePointsCount);

		this.bSplineType = BSplineCurve.B_UNIFORM;
		this.q = q;
	}

	build(){
		let verts = [];

		this.knots = [];

		let n = this.pointAry.length-1;
		if(!this.q) this.q = n+1;
		let q = this.q;

		switch(this.bSplineType) {
			case BSplineCurve.B_UNIFORM:
				for(let i=0; i<=n+q; i++) {
					if(0 <= i && i < q) this.knots.push(0);
					else if(q <= i && i <= n) this.knots.push(i-q+1);
					else this.knots.push(n-q+2);
				}
				break;
			case BSplineCurve.B_NONUNIFORM:
				let c_k = new Array(n+1);
				let full_sum = 0;
				for(let i=1; i<=n; i++) {
					c_k[i] = Vec3.sub(pointAry[i].position, pointAry[i-1].position).length();
					full_sum += c_k[i];
				}
				for(let k=0; k<=n+q; k++){
					if(k<q) this.knots.push(0);
					else if(k<=n) {
						let part_sum = 0;
						for(let i=1; i<=k-q+1; i++) part_sum += c_k[i];
						let ratio1 = (k-q+1)/(n-q+2);
						this.knots.push( (ratio1*c_k[k-q+2]+part_sum)/full_sum*(n-q+2) );
					}
					else this.knots.push(n-q+2);
				}
				break;
		}


		let step_t = (this.knots[n+1] - this.knots[q-1]) / (this.splinePointsCount-1);
		for(let stpT=0; stpT < this.splinePointsCount; stpT++){
			let point = this.bspline_r2(this.knots[q-1] + stpT*step_t);
			verts.push(point[0], point[1], point[2]);
		}

		return verts;
	}

	bspline_r(t){
		let n = this.pointAry.length - 1;
		let r_x = 0, r_y = 0, r_z = 0;
		for(let k=0; k<=n; k++){
				let mult = this._N(k, this.q, t);
				r_x += this.pointAry[ k ].position.x * mult;
				r_y += this.pointAry[ k ].position.y * mult;
				r_z += this.pointAry[ k ].position.z * mult;	
		}
		return [r_x, r_y, r_z];
	}

	bspline_r2(t){
		let n = this.pointAry.length - 1;
		let r_x = 0, r_y = 0, r_z = 0;
		let N = this._N2(n, this.q-1, t);
		for(let k=0; k<=n; k++){
				r_x += this.pointAry[ k ].position[0] * N[k];
				r_y += this.pointAry[ k ].position[1] * N[k];
				r_z += this.pointAry[ k ].position[2] * N[k];	
		}
		return [r_x, r_y, r_z];
	}

	_N(k, q, t){
		let knots = this.knots;
		if(q === 1) {
			if(knots[k] <= t && knots[k+1] >= t) return 1;
			else return 0;
		}
		let div1, div2;
 		if(knots[k+q-1] === knots[k]) div1 = 0;
 		else                          div1 = 1/(knots[k+q-1]-knots[k]);

 		if(knots[k+q] === knots[k+1]) div2 = 0;
 		else                          div2 = 1/(knots[k+q]-knots[k+1]);

		return (t-knots[k])*div1*this._N(k, q-1, t) + (knots[k+q]-t)*div2*this._N(k+1, q-1, t);
	}

	_N2(n, p, u){
		let U = this.knots;
		let m = U.length-1;
		let N = new Array(n+1);
		for(let ind=0; ind<=n; ind++) N[ind]=0;
		if(u===U[0]) { N[0]=1.0; return N; }
		if(u===U[m]) { N[n]=1.0; return N; }
		let k = 0;
		while(U[k+1]<u) k++;
		N[k]=1.0;
		for(let d=1; d<=p; d++){
			N[k-d] = (U[k+1]-u)/(U[k+1]-U[k-d+1])*N[k-d+1];
			for(let i=k-d+1; i<=k-1; i++){
				N[i] = (u-U[i])/(U[i+d]-U[i])*N[i] + (U[i+d+1]-u)/(U[i+d+1]-U[i+1])*N[i+1];
			}
			N[k] = (u-U[k])/(U[k+d]-U[k])*N[k];
			
		}
		return N;
	}

}

BSplineCurve.B_UNIFORM     = 1;
BSplineCurve.B_NONUNIFORM  = 2;

export default BSplineCurve;