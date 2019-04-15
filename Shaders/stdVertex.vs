#version 300 es                         // Telling which version we are going to use

layout(location=0) in vec3 a_position;

uniform mat4 uProjView;

void main(void){
	gl_Position  = uProjView * vec4(a_position, 1.0);
	gl_PointSize = 3.0;
}