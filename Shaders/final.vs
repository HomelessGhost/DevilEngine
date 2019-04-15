#version 300 es
layout(location=0) in vec4 a_position;
layout(location=2) in vec2 a_uv;

out highp vec2 vUV;

void main(void){
	vUV = vec2(a_uv.s,1.0-a_uv.t);
	gl_Position =  vec4(a_position.xyz, 1.0);
}


// layout(location=0) in vec4 a_position;
// layout(location=2) in vec2 a_uv;

// out highp vec2 vUV;

// uniform UBOTransform{
// 	mat4 matProjection;
// 	mat4 matCameraView;
// 	vec3 posCamera;
// };

// void main(void){
// 	vUV = vec2(a_uv.s,a_uv.t);
// 	gl_Position	= vec4(a_position.xyz,1.0);
// }