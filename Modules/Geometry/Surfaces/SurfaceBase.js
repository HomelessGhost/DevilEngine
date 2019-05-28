import Vec3 from "../../../maths/Vec3.js"

// Abstact class for handling all surface types
class SurfaceBase{
	constructor(){
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

		this.getCoordDelegate(t, tau);
	}

	// Abstract method for getting coordinate by parameters
	getCoordDelegate(t, tau){}

	firstDerivative(t, tau){

	}

	secondDerivative(t, tau){

	}

	// Abstract method for building all spacial coordinates
	build(){}


}