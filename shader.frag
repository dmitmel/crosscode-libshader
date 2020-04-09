#version 300 es
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D tex;
uniform float random_seed;
uniform float time;
uniform vec2 real_size;
// uniform vec2 mouse;
// uniform float context_scale;

in vec2 frag_texcoord;
out vec4 out_color;

// taken from https://github.com/hughsk/glsl-hsv2rgb/blob/master/index.glsl
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// // taken from https://gist.github.com/yiwenl/3f804e80d0930e34a0b33359259b556c#file-glsl-rotation-2d
// vec2 rotate(vec2 v, float a) {
//   float s = sin(a);
//   float c = cos(a);
//   mat2 m = mat2(c, -s, s, c);
//   return m * v;
// }

// taken from https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83#generic-123-noise
float simple_noise_1(float n) {
  return fract(sin(n) * 43758.5453123);
}

// taken from https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83#generic-123-noise
float simple_noise_2(float p) {
  float fl = floor(p);
  float fc = fract(p);
  return mix(simple_noise_1(fl), simple_noise_1(fl + 1.0), fc);
}

const float COLOR_SHIFT_DISTANCE = 3.0; // pixels
// const float FLICKERING_RGB_RANGE = 5.0 / 255.0;
const float FLICKERING_RGB_RANGE = 0.0;
const float FLICKERING_TIME_FACTOR = 50.0;
const float REFRESH_LINE_SPEED = 5.0; // seconds per screen
const float REFRESH_LINE_TOTAL_HEIGHT = 1.25; // screens
const float REFRESH_LINE_RGB_RANGE = 20.0 / 255.0;
const float HORIZONTAL_DISTORTION_TIME_FACTOR = 10.0;
const float HORIZONTAL_DISTORTION_HEIGHT = 4.0; // pixels
const float HORIZONTAL_DISTORTION_MAX = 1.0; // pixels
const float SCAN_LINES_HEIGHT = 4.0; // pixels
const float SCAN_LINE_RGB_RANGE = 5.0 / 255.0;

void main(void) {
  vec2 texcoord = frag_texcoord;
  vec2 texcoord_real = frag_texcoord * real_size;

  // vertical wave
  // float offset = (sin(texcoord_real.x / 40.0 + time * 4.0) * 10.0) / real_size.y;
  // out_color = texture(tex, texcoord + vec2(0, offset));

  // trip-shader (no mushrooms were involved!)
  // float p = distance(texcoord_real, mouse * context_scale);
  // vec4 rainbow_color = vec4(hsv2rgb(vec3(p / 200.0 + time, 1.0, 1.0)), 1.0);
  // out_color = mix(texture(tex, texcoord), rainbow_color, 1.0 / 4.0);

  float refresh_line_intensity =
    fract((texcoord.y - time / REFRESH_LINE_SPEED) / REFRESH_LINE_TOTAL_HEIGHT);

  vec2 shifted_coords = vec2(
    texcoord.x + simple_noise_2(
        random_seed
      + time * HORIZONTAL_DISTORTION_TIME_FACTOR
      + floor(texcoord_real.y / HORIZONTAL_DISTORTION_HEIGHT) * HORIZONTAL_DISTORTION_HEIGHT
    ) / real_size.x * HORIZONTAL_DISTORTION_MAX
    ,
    texcoord.y
  );

  vec4 color1 = texture(tex, shifted_coords - vec2(COLOR_SHIFT_DISTANCE / real_size.x, 0));
  vec4 color2 = texture(tex, shifted_coords);
  vec4 color3 = texture(tex, shifted_coords + vec2(COLOR_SHIFT_DISTANCE / real_size.x, 0));

  out_color = vec4(
    vec3(color1.r, color2.g, color3.b) + vec3(
        sin(time * FLICKERING_TIME_FACTOR) * FLICKERING_RGB_RANGE
      + (float(mod(texcoord_real.y, SCAN_LINES_HEIGHT * 2.0) >= SCAN_LINES_HEIGHT) * 2.0 - 1.0) * SCAN_LINE_RGB_RANGE
      + refresh_line_intensity * REFRESH_LINE_RGB_RANGE
    ), color2.a
  );
}
