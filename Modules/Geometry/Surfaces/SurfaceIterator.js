import SurfaceBase     from "./SurfaceBase.js";
import Vec3          from "../../../maths/Vec3.js";

class SurfaceIterator{
	constructor(surfaceBase){
		this.surfaceBase = surfaceBase;
		this.t = 0;
		this.tau = 0;
		this.alpha = Math.PI/15;
	}

	deltaT(){
		let FD = this.surfaceBase.firstDerivative(this.t, this.tau);
		let s1 = new Vec3(FD.s1),
			s2 = new Vec3(FD.s2);

		let SD = this.surfaceBase.secondDerivative(this.t, this.tau);
		let s11 = new Vec3(SD.s11),
			s22 = new Vec3(SD.s22);

		let n = Vec3.cross(s1, s2).normalize();

		let delta = this.alpha*s1.length()/Math.abs(Vec3.dot(n, s11));

		if(delta > 0.1) delta = 0.1;
		if(delta < 0.001) delta = 0.001;
		return delta;
	}

	nextT(){
		this.t += this.deltaT();
		if(this.t >= 1) this.t = 1;

		return this.t;
	}

	deltaTau(){
		let FD = this.surfaceBase.firstDerivative(this.t, this.tau);
		let s1 = new Vec3(FD.s1),
			s2 = new Vec3(FD.s2);

		let SD = this.surfaceBase.secondDerivative(this.t, this.tau);
		let s11 = new Vec3(SD.s11),
			s22 = new Vec3(SD.s22);

		let n = Vec3.cross(s1, s2).normalize();

		let delta = this.alpha*s2.length()/Math.abs(Vec3.dot(n, s22));
		if(delta > 0.1) delta = 0.1;
		if(delta < 0.001) delta = 0.001;
		return delta;
	}

	nextTau(){
		this.tau += this.deltaTau();
		if(this.tau >= 1) this.tau = 1;

		return this.tau;
	}

	buildMap(){
		this.reset();

		let map = [];
		let mapT = { t: [], tauAry: map };
		mapT.t.push(0);

		let layer = 0;

		let quit = false;

		while(this.t <= 1){
			let tAry = [];
			tAry.push(this.deltaT())
			map.push( [] );
			map[layer].push( 0 );

			let tau = this.tau;
			while(tau != this.nextTau()){
				map[layer].push( this.tau );
				tau = this.tau;
				tAry.push(this.deltaT())
			}
			this.tau = 0;

			layer += 1;
			// Average delta t
			let sum = 0;

			for(let m = 0; m < tAry.length; m++) sum += tAry[m];
			this.t += sum / tAry.length;
			if(quit) break;
			if( this.t > 1 ) {
				this.t = 1;
				quit = true;
			}
			mapT.t.push(this.t);
			//________________


		}

		return mapT;

	}

	reset(){
		this.t   = 0;
		this.tau = 0;
	}
}

export default SurfaceIterator;