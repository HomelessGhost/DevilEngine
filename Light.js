class BaseLight{
	constructor(color, intensity){
		this.color     = color;
		this.intensity = intensity;
	}
}

class DirectionalLight{
	constructor(base, direction){
		this.base      = base;
		this.direction = direction;
	}
}

class Attenuation{
	constructor(constant, linear, exponent){
		this.constant = constant;
		this.linear   = linear;
		this.exponent = exponent;
	}
}

class PointLight{
	constructor(baseLight, attenuation, position){
		this.base        = baseLight;
		this.attenuation = attenuation;
		this.position    = position;
	}

	setPosition(x, y, z){
		this.position[0] = x;
		this.position[1] = y;
		this.position[2] = z;
	}
	addDebugDot(debugDot){
		this.debugDot = debugDot;
	}
	renderDebugDot(camera){
		this.debugDot.render(camera);
	}
}

export { BaseLight, DirectionalLight, PointLight, Attenuation };