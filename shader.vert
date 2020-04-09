#version 300 es

in vec2 position;
in vec2 texcoord;
out vec2 frag_texcoord;

void main(void) {
  gl_Position = vec4(position, 0.0, 1.0);
  frag_texcoord = texcoord;
}
