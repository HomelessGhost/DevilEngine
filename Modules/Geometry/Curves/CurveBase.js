import Vec3 from "../../../maths/Vec3.js"

// Abstact class for handling all curve types
class CurveBase{
	constructor(pointAry, splinePointsCount){
		this.pointAry = pointAry;
		this.splinePointsCount = splinePointsCount;
		this.fdStep = 0.0001;  // Finite difference step
	}

	getCoord(t){
		if( 1 < t || t < 0 ) {
			console.log("Parameter t out of range. Must be between 0 and 1");
			return;
		}

		return this.getCoordDelegate(t);
	}

	// Abstract method for getting coordinate by parameters
	getCoordDelegate(t){}

	firstDerivative(t){
		let h = this.fdStep;
		let vL, vR;
		if(t < h){
			vL = this.getCoord(t);
			vR = this.getCoord(t+h);
			return [ (vR[0] - vL[0])/h, (vR[1] - vL[1])/h, (vR[2] - vL[2])/h ];
		}
		else if(t > 1-h){
			vL = this.getCoord(t-h);
			vR = this.getCoord(t);
			return [ (vR[0] - vL[0])/h, (vR[1] - vL[1])/h, (vR[2] - vL[2])/h ];
		}
		else{
			vL = this.getCoord(t-h);
			vR = this.getCoord(t+h);
			return [ (vR[0] - vL[0])/(2*h), (vR[1] - vL[1])/(2*h), (vR[2] - vL[2])/(2*h) ];
		}
	}

	secondDerivative(t){
		let h = this.fdStep;
		let vL, vR, vH;
		if(t < h){
			vL = this.getCoord(0);
			vH = this.getCoord(h);
			vR = this.getCoord(2*h);
		}
		else if(t > 1-h){
			vL = this.getCoord(1-2*h);
			vH = this.getCoord(1-h);
			vR = this.getCoord(1);
		}

		else{
			vL = this.getCoord(t-h);
			vH = this.getCoord(t);
			vR = this.getCoord(t+h);
		}

		return [ (vR[0] + vL[0] - 2*vH[0])/(h*h),
		         (vR[1] + vL[1] - 2*vH[1])/(h*h), 
		         (vR[2] + vL[2] - 2*vH[2])/(h*h) ];

	}

	// Abstract method for building all spacial coordinates
	build(){}


}

export default CurveBase;