import Vec3 from "../../../maths/Vec3.js"

// Abstact class for handling all surface types
class SurfaceBase{
	constructor(pointAry, surfSizeX, surfSizeZ, splinePointsX, splinePointsZ){
		this.pointAry = pointAry;
		this.surfSizeX = surfSizeX;
		this.surfSizeZ = surfSizeZ;
		this.splinePointsX = splinePointsX;
		this.splinePointsZ = splinePointsZ;
		this.fdStep = 0.0001;  // Finite difference step
	}

	getCoord(t, tau){
		if( 1 < t || t < 0 ) {
			console.log("Parameter t out of range. Must be between 0 and 1");
			return;
		}

		if( 1 < tau || tau < 0 ) {
			console.log("Parameter t out of range. Must be between 0 and 1");
			return;
		}

		return this.getCoordDelegate(t, tau);
	}

	// Abstract method for getting coordinate by parameters
	getCoordDelegate(t, tau){}

	firstDerivative(t, tau){
		let h = this.fdStep;
		let vL, vR, vD, vU;
		let s1, s2;

		if(t < h){
			vL = this.getCoord(t, tau);
			vR = this.getCoord(t+h, tau);
			s1 = [ (vR[0] - vL[0])/h, (vR[1] - vL[1])/h, (vR[2] - vL[2])/h ];
		}
		else if(t > 1-h){
			vL = this.getCoord(t-h, tau);
			vR = this.getCoord(t, tau);
			s1 = [ (vR[0] - vL[0])/h, (vR[1] - vL[1])/h, (vR[2] - vL[2])/h ];
		}
		else{
			vL = this.getCoord(t-h, tau);
			vR = this.getCoord(t+h, tau);
			s1 = [ (vR[0] - vL[0])/(2*h), (vR[1] - vL[1])/(2*h), (vR[2] - vL[2])/(2*h) ];
		}

		if(tau < h){
			vU = this.getCoord(t, tau);
			vD = this.getCoord(t, tau+h);
			s2 = [ (vD[0] - vU[0])/h, (vD[1] - vU[1])/h, (vD[2] - vU[2])/h ];
		}
		else if(tau > 1-h){
			vU = this.getCoord(t, tau-h);
			vD = this.getCoord(t, tau);
			s2 = [ (vD[0] - vU[0])/h, (vD[1] - vU[1])/h, (vD[2] - vU[2])/h ];
		}
		else{
			vU = this.getCoord(t, tau-h);
			vD = this.getCoord(t, tau+h);
			s2 = [ (vD[0] - vU[0])/(2*h), (vD[1] - vU[1])/(2*h), (vD[2] - vU[2])/(2*h) ];
		}

		return { s1: s1, s2: s2 };

	}

	secondDerivative(t, tau){
		let h = this.fdStep;
		let vL, vR, vH;
		let vU, vD, vV;
		if(t < h){
			vL = this.getCoord(0, tau);
			vH = this.getCoord(h, tau);
			vR = this.getCoord(2*h, tau);
		}
		else if(t > 1-h){
			vL = this.getCoord(1-2*h, tau);
			vH = this.getCoord(1-h, tau);
			vR = this.getCoord(1, tau);
		}

		else{
			vL = this.getCoord(t-h, tau);
			vH = this.getCoord(t, tau);
			vR = this.getCoord(t+h, tau);
		}

		let s11 = [ (vR[0] + vL[0] - 2*vH[0])/(h*h),
		            (vR[1] + vL[1] - 2*vH[1])/(h*h), 
		            (vR[2] + vL[2] - 2*vH[2])/(h*h) ];

		if(tau < h){
			vU = this.getCoord(t, 0);
			vV = this.getCoord(t, h);
			vD = this.getCoord(t, 2*h);
		}
		else if(tau > 1-h){
			vU = this.getCoord(t, 1-2*h);
			vV = this.getCoord(t, 1-h);
			vD = this.getCoord(t, 1);
		}

		else{
			vU = this.getCoord(t, tau-h);
			vV = this.getCoord(t, tau);
			vD = this.getCoord(t, tau+h);
		}

		let s22 = [ (vD[0] + vU[0] - 2*vV[0])/(h*h),
		            (vD[1] + vU[1] - 2*vV[1])/(h*h), 
		            (vD[2] + vU[2] - 2*vV[2])/(h*h) ];

		let vRD = this.getCoord(t+h, tau+h);

		// let s12 = [ (vRD[0] - vD[0] - vR[0] + vH[0])/(h*h),
		//             (vRD[1] - vD[1] - vR[1] + vH[1])/(h*h),
		//             (vRD[2] - vD[2] - vR[2] + vH[2])/(h*h) ];

		return { s11: s11, s22: s22, s12: s12 };
	}

	// Abstract method for building all spacial coordinates
	build(){}
}

export default SurfaceBase;