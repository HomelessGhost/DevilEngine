#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;

out highp vec2 texCoord0;
out vec3 normal0;
out vec3 worldPos0;

uniform mat4 uProjView;


void main(void){
	normal0 = a_normal;
	texCoord0 = a_uv;
	worldPos0 = a_position;
	gl_Position  = uProjView * vec4(a_position, 1.0);
}