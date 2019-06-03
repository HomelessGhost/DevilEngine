import CurveBase     from "./CurveBase.js";
import Vec3          from "../../../maths/Vec3.js";

class CurveIterator{
	constructor(curveBase){
		this.curveBase = curveBase;
		this.t = 0;
		this.alpha = Math.PI/15;
	}

	delta(){
		let fd = new Vec3(this.curveBase.firstDerivative(this.t));
		let sd = new Vec3(this.curveBase.secondDerivative(this.t));
		let cross = Vec3.cross(fd, sd).length();

		let delta = this.alpha*fd.lengthSqr()/cross;
		if(delta > 0.01) delta = 0.01;
		if(delta < 0.001) delta = 0.001;
		return delta;
	}

	next(){
		this.t += this.delta();
		if(this.t >= 1) this.t = 1;

		return this.t;
	}

	buildMap(){
		let map = [];
		map.push(0);
		let t = this.t;
		while(t != this.next()){
			map.push( this.t );
			t = this.t;
		}
		return map;
	}

	reset(){
		this.t = 0;
	}
}

export default CurveIterator;