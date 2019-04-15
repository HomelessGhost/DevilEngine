import GL		 from "../gl.js";
import Core 	 from "../core.js";
import Camera    from "../Components/Camera.js";
import FinalQuad from "../Primitives/FinalQuad.js"
import loadShaderResource from "../garbageFuncs.js";
import Shader       from "../Shader.js";
import VAO          from "../VAO.js";
import { FBO_2 }    from "../FBO.js";

import { System } from "../ECS.js";

const QUERY_COM = [ "Transform", "Drawable" ];

class RenderSystem extends System{
	constructor(){
		super();

		//Render Objects
		this.frameBuffer 	= null;
		this.material		= null;
		this.shader			= null;
		this.vao			= null;

		// FBO tricks
		this.finalQuad   = FinalQuad.vao();
		loadShaderResource('./Shaders/final.vs', 'final_v');
        loadShaderResource('./Shaders/final.fs', 'final_f');
        this.finalShader   = new Shader(   "final", Core.shadersSrc.get("final_v"), Core.shadersSrc.get("final_f")  );


        this.finalShader.prepareUniform("bufColor", "sampler2D");

		//UBOs for Updating
		this.UBOModel		= Core.getUBO("UBOModel");
		this.UBOTransform	= Core.getUBO("UBOTransform");

		//GL Option states
		this.options	= {
			blend 					: { state : false,	id : GL.ctx.BLEND },
			sampleAlphaCoverage 	: { state : false,	id : GL.ctx.SAMPLE_ALPHA_TO_COVERAGE },
			depthTest				: { state : true,	id : GL.ctx.DEPTH_TEST },
			depthMask				: { state : true },
			cullFace				: { state : true,	id : GL.ctx.CULL_FACE },
			cullDir					: { state : GL.ctx.BACK },
			blendMode				: { state : GL.BLEND_ALPHA },
		}		
	}

	update(ecs){
		// Set up current Core frame buffer

		FBO_2.clear(Core.fboPick,false)
	//	GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER, Core.fbo.id);

		//............................................
		//Update Main UBO
		this.UBOTransform
			.updateItem("projViewMatrix",	Camera.getProjectionViewMatrix( Core.camera.com.Camera ) )
			.updateItem("cameraPos",		Core.camera.com.Transform._position )
			.updateItem("globalTime",		Core.sinceStart )
			.updateGL();

		//............................................
		let d,e, ary = ecs.queryEntities( QUERY_COM );
        GL.clear();	//Clear Frame Buffer

		//Draw all active Entities
		for( e of ary ){
			//......................................
			if(!e.active) continue;
			if(e.com.Drawable.customDrawFunction){
				e.com.Drawable.customDrawFunction(e);
				this.material = null;
				this.shader	  = null;
				continue;
			}

			// Check if there is anything to render
			d = e.com.Drawable;
			if(!d.vao || d.vao.elmCount === 0){
				//console.log("VAO has no index/vertices or null : ", e.name);
				continue;
			}

			//......................................
			//console.log("Draw", e.name);
			this.loadMaterial( d.material );
			this.loadEntity( e );

			this.draw( d );
		}
		// Set up display frame buffer
		this.material = null;
		this.shader	  = null;

		GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER, null);
		


		this.finalShader.bind();

		FBO_2.blit(Core.fboPick,Core.fboFinal);
		

		this.finalShader.setUniforms("bufColor", Core.fboFinal.bColor.texture);

		VAO.draw(this.finalQuad, GL.ctx.TRIANGLES, true);
		this.finalShader.unbind();


	}

	//===============================================================
	// LOADERS
		//Load up a shader
		loadShader(s){
			if(this.shader === s) return;
			this.shader = s;
            GL.ctx.useProgram(s.program);
			return this;
		}

		//Load Material and its shader
		loadMaterial(mat){
			//...............................
			//If material is the same, exit.
			if(this.material === mat) return;
			this.material = mat;

			//...............................
			//Is the shader for the material different
			if(this.shader !== mat.shader){
				this.shader = mat.shader;
                GL.ctx.useProgram(this.shader.program);
			}

			//...............................
			mat.applyUniforms();			//Push any saved uniform values to shader.
			this.loadOptions(mat.options);	//Enabled/Disable GL Options

			return this;
		}

		loadOptions(aryOption){
			let k, v;
			for(k in aryOption){
				v = aryOption[k];

				if(this.options[k] && this.options[k].state !== v){
					this.options[k].state = v;

					switch(k){
						case "blendMode":	GL.blendMode( v ); break;
						case "depthMask":	GL.ctx.depthMask( v ); break;
						case "cullDir":		GL.ctx.cullFace( v ); break;
						default:
                            GL.ctx[ (this.options[k].state)? "enable" : "disable" ]( this.options[k].id );
						break;
					}
					
				}
			}

			return this;
		}

		loadEntity(e){ //console.log("Load Entity ", e.name);
			//..........................................
			//Handle UBOModel Data
			let uboChanged = false;
			if( this.shader.options.modelMatrix ){
				this.UBOModel.updateItem("modelMatrix", e.com.Transform.modelMatrix);
				uboChanged = true;
			}

			if( this.shader.options.normalMatrix ){
				console.log("Need to implement handling Normal Matrix");
				//this.UBOModel.updateItem("normalMatrix", e.com.Transform.localMatrix);
				//uboChanged = true;
			}

			if( uboChanged ) this.UBOModel.updateGL();

			//..........................................
			this.loadOptions( e.com.Drawable.options );
		}

	//===============================================================
	// DRAWING
		draw(d){
			//...............................
			GL.ctx.bindVertexArray(d.vao.id);
			//...............................
			if(!d.vao.isInstanced){
				if(d.vao.isIndexed)	GL.ctx.drawElements(d.drawMode, d.vao.elmCount, GL.ctx.UNSIGNED_SHORT, 0);
				else				GL.ctx.drawArrays(d.drawMode, 0, d.vao.elmCount);
			}else{
				if(d.vao.isIndexed)	GL.ctx.drawElementsInstanced(d.drawMode, d.vao.elmCount, GL.ctx.UNSIGNED_SHORT, 0, d.vao.instanceCount);
				else				GL.ctx.drawArraysInstanced(r.drawMode, 0, d.vao.elmCount, d.vao.instanceCount);
			}

			//...............................
			//GL.ctx.bindVertexArray(null);
			return this;
		}
}

export default RenderSystem;