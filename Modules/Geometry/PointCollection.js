import VAO from "../../VAO.js";
import Shader from "../../Shader.js";
import { Components } from "../../ECS.js";
import Core  from "../../core.js";
import { Quat, Vec3 }	from "../../Maths.js";
import GL               from "../../gl.js";
import { Animation }    from "./Animation.js";

class Point{
	constructor(x, y, z, cHex){
		this.position   = new Vec3(x, y, z);
		this.color      = cHex ? cHex : '#000000';
		this.references = [];
		this.id         = null;

		this.xFixed = false;
		this.yFixed = false;
		this.zFized = false;
	}
}

//......................................
//CREATE SHADER
		let vShader = '#version 300 es\n'+
			'layout(location=0) in vec3 a_vertPosition;' +
			'layout(location=1) in vec3 a_id;' +
			'layout(location=2) in lowp vec3 a_color;' +			
            'uniform UBOTransform{' +
            '   mat4	projViewMatrix;' +
            '   vec3	cameraPos;' +
            '   float	globalTime;' +
            '   vec2	screenSize;' +
            '};' +
			'out lowp vec3 color;'+
			'out lowp vec3 id;'+
			'void main(void){'+
				'float d = abs(distance(cameraPos.xyz,a_vertPosition.xyz));'+
				'if(d > 0.0f) gl_PointSize = max(8.0f,(50.0f/d));' +
				'else gl_PointSize = 8.0f;' +
				'color = a_color;'+
				'id = a_id;'+
				'gl_Position = projViewMatrix * vec4(a_vertPosition, 1.0); '+
			'}';

		let fShader = '#version 300 es\n precision mediump float;'+
			'in lowp vec3 color; in lowp vec3 id;'+
			'layout(location = 0) out vec4 outColor0;'+
        	'layout(location = 1) out vec4 outColor1;'+
			'void main(void){ outColor0 = vec4(color,1.0);'+
			 'outColor1 = vec4(id,1.0);' +
			 ' }';




class PointCollection{
	constructor(bufferSize){
		if(!Core.mShaderProgs.get("DragPoints")){
			Core.mShaderProgs.set( "DragPoints", new Shader("DragPointShader", vShader,fShader) );

		}
		this.nextID   = 100;
		this.points   = [];
		this.vao      = new VAO();
		this.vertices = [];
		this.shader   = Core.mShaderProgs.get("DragPoints");

		let fsize = Float32Array.BYTES_PER_ELEMENT;
		this.compSize = 9;
		this.stride = this.compSize * fsize; //How large is the vertex data in bytes, Pos(3)-ID(3)-Color(3), 9 Floats at 4 bytes each

		this.bufferSize = bufferSize ? bufferSize * this.stride : 1000000 * this.stride;


		this.vao.create()
			.emptyFloatBuffer("bVertices",this.bufferSize , Shader.ATTRIB_POSITION_LOC, 3, this.stride, 0, false) //Setup buffer and verts
			.partitionFloatBuffer(1,3,this.stride,fsize * 3) //Setup ID
			.partitionFloatBuffer(2,3,this.stride,fsize * 6) //Setup Color
			.finalize("DragPoints");
	}

	updateCallback(o){
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, this.vao.vao["bVertices"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, o.index * this.stride, o.position, 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, null);


	//	this.sendUpdateRequest();
	}

	buildBuffer(){
		let ary = [], color, cid;
		for(let i=0; i < this.points.length; i++){
			color	= GL.rgbArray(this.points[i].color);
			cid		= PointCollection.idToColor(this.points[i].id);

			ary.push(
				this.points[i].position[0],
				this.points[i].position[1],
				this.points[i].position[2],
				cid[0],
				cid[1],
				cid[2],
				color[0],
				color[1],
				color[2]
			);
		}

		//Calc how many vec4 elements we have

		this.vao.vao.elmCount = ary.length / this.compSize;

		//Push verts to GPU.
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, this.vao.vao["bVertices"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(ary), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);

		return this;
	}

	static addPoint(collection, point){
		point.index = collection.points.length;
		point.references.push({ callback: collection.updateCallback.bind(collection) });
		point.id = collection.nextID;
		collection.nextID++;
		collection.points.push(point);

		let cid	= PointCollection.idToColor(point.id);
		let color	= GL.rgbArray(point.color);
		let ary = new Float32Array([point.position[0], point.position[1], point.position[2], cid[0], cid[1], cid[2], color[0], color[1], color[2]]);

		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, collection.vao.vao["bVertices"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, point.index * collection.stride, ary, 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, null);

		collection.vao.vao.elmCount++;
	}

	static colorToID(a){ return a[0] | (a[1] << 8) | (a[2] << 16); }
	static idToColor(v){ //With 3 bytes, the max value is 16777215;
		let a = new Float32Array(3);
		a[0] = (v & 0xff) / 255.0;
		a[1] = ((v & 0xff00) >> 8) / 255.0;
		a[2] = ((v & 0xff0000) >> 16) / 255.0;
		return a;
	}

} Components(PointCollection);

export default PointCollection; 
export { PointCollection, Point };