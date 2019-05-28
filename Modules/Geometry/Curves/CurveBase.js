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

		this.getCoordDelegate(t);
	}

	// Abstract method for getting coordinate by parameters
	getCoordDelegate(t){}

	firstDerivative(t){

	}

	secondDerivative(t){

	}

	// Abstract method for building all spacial coordinates
	build(){}


}

export default CurveBase;