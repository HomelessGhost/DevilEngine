#version 300 es                         // Telling which version we are going to use

in vec3 a_vertPosition;

uniform mat4 uProjView;


void main(void){
	gl_Position  = uProjView * vec4(a_vertPosition, 1.0);
}