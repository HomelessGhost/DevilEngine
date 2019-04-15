#version 300 es
in vec4 a_VertPosition;	
in vec2 a_uv;

uniform mat4 uProjMatrix;
uniform mat4 uCameraMatrix;
uniform mat4 uMVMatrix;

	
out highp vec3 texCoord;  //Interpolate UV values to the fragment shader
		
void main(void){
	texCoord = a_VertPosition.xyz;
	gl_Position = uProjMatrix * uCameraMatrix * uMVMatrix * vec4(a_VertPosition.xyz, 1.0); 
}