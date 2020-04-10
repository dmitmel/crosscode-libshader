#version 300 es
// Copyright (C) 2020 Dmytro Meleshko
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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


float max2(vec2 v) { return max(v.x , v.y); }
float mul2(vec2 v) { return     v.x * v.y ; }
float sum2(vec2 v) { return     v.x + v.y ; }

// taken from https://github.com/hughsk/glsl-hsv2rgb/blob/master/index.glsl
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// // taken from https://gist.github.com/yiwenl/3f804e80d0930e34a0b33359259b556c#file-glsl-rotation-2d
// vec2 rotate(vec2 point, float a) {
//   float s = sin(a);
//   float c = cos(a);
//   mat2 m = mat2(c, -s, s, c);
//   return m * point;
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
// slow eye burn mode:
// const float FLICKERING_RGB_RANGE = 3.0 / 255.0;
const float FLICKERING_RGB_RANGE = 0.0;
const float FLICKERING_TIME_FACTOR = 50.0;
const float REFRESH_LINE_SPEED = 5.0; // seconds per screen
const float REFRESH_LINE_TOTAL_HEIGHT = 1.25; // screens
const float REFRESH_LINE_RGB_RANGE = 20.0 / 255.0;
const float HORIZONTAL_DISTORTION_TIME_FACTOR = 10.0;
const float HORIZONTAL_DISTORTION_SECTION_HEIGHT = 4.0; // pixels
const float HORIZONTAL_DISTORTION_MAX = 1.0; // pixels
const float SCAN_LINES_HEIGHT = 4.0; // pixels
const float SCAN_LINE_RGB_RANGE = 5.0 / 255.0;
const float SCREEN_CURVATURE = 0.2;
const float SCREEN_FRAME_SHADOW_LENGTH = 0.5;
// const vec4 SCREEN_FRAME_COLOR = vec4(vec3(0.0), 1.0);
const vec4 SCREEN_FRAME_COLOR = vec4(vec3(1.0), 1.0);

// taken from https://github.com/Swordfish90/cool-retro-term/blob/f2f38c0e0d86a32766f6fe8fc6063f1d578b55de/app/qml/NewTerminalFrame.qml#L31-L35
// it's quite fascinating that a complex-looking transform that I want to get
// can be achieved with such a simple function AND no matricies whatsoever!
// here's an implementation fo this function in JS: https://github.com/Swordfish90/cool-retro-term/blob/79773ba95c01e43ee5fb19340c653cbb2369942d/app/qml/PreprocessedTerminal.qml#L221-L230
// I may need it in the future for correcting mouse position
vec2 apply_screen_curvature(vec2 point) {
  vec2 center_texcoord = vec2(0.5) - point;
  float distortion = dot(center_texcoord, center_texcoord) * SCREEN_CURVATURE;
  return (point - center_texcoord * (1.0 + distortion) * distortion);
}

// taken from https://github.com/Swordfish90/cool-retro-term/blob/f2f38c0e0d86a32766f6fe8fc6063f1d578b55de/app/qml/NewTerminalFrame.qml#L53-L74
void draw_frame(vec2 texcoord) {
  vec3 color = vec3(0.0);
  float alpha = 0.0;
  float out_shadow_length = SCREEN_FRAME_SHADOW_LENGTH;
  float in_shadow_length = SCREEN_FRAME_SHADOW_LENGTH * 0.5;
  float out_shadow = max2(1.0 - smoothstep(vec2(-out_shadow_length), vec2(0.0), texcoord) + smoothstep(vec2(1.0), vec2(1.0 + out_shadow_length), texcoord));
  out_shadow = clamp(sqrt(out_shadow), 0.0, 1.0);
  color += SCREEN_FRAME_COLOR.rgb * out_shadow;
  vec2 aadelta = 1.0 / real_size;
  alpha = sum2(1.0 - smoothstep(vec2(0.0), aadelta, texcoord) + smoothstep(vec2(1.0) - aadelta, vec2(1.0), texcoord));
  alpha = clamp(alpha, 0.0, 1.0) * mix(1.0, 0.9, out_shadow);
  float in_shadow = 1.0 - mul2(smoothstep(0.0, in_shadow_length, texcoord) - smoothstep(1.0 - in_shadow_length, 1.0, texcoord));
  in_shadow = 0.5 * in_shadow * in_shadow;
  alpha = max(alpha, in_shadow);
  out_color = vec4(color * alpha, alpha);
}

void main(void) {
  // NOTE: frag_texcoord is a coordinate in the screen space!!!
  vec2 texcoord = apply_screen_curvature(frag_texcoord);

  // can this be done without an `if`?
  if (texcoord.x < 0.0 || texcoord.y < 0.0 || texcoord.x > 1.0 || texcoord.y > 1.0) {
    draw_frame(texcoord);
    return;
  }

  vec2 texcoord_real = texcoord * real_size;

  // vertical wave
  // float offset = (sin(texcoord_real.x / 40.0 + time * 4.0) * 10.0) / real_size.y;
  // out_color = texture(tex, frag_texcoord + vec2(0, offset));

  // trip-shader (no mushrooms were involved!)
  // float p = distance(texcoord_real, mouse * context_scale);
  // vec4 rainbow_color = vec4(hsv2rgb(vec3(p / 200.0 + time, 1.0, 1.0)), 1.0);
  // out_color = mix(texture(tex, frag_texcoord), rainbow_color, 1.0 / 4.0);

  float refresh_line_intensity =
    fract((texcoord.y - time / REFRESH_LINE_SPEED) / REFRESH_LINE_TOTAL_HEIGHT);

  float horizontal_distortion = simple_noise_2(
      random_seed
    + time * HORIZONTAL_DISTORTION_TIME_FACTOR
    + floor(texcoord_real.y / HORIZONTAL_DISTORTION_SECTION_HEIGHT) * HORIZONTAL_DISTORTION_SECTION_HEIGHT
  ) * (HORIZONTAL_DISTORTION_MAX / real_size.x);
  vec2 random_distortion = vec2(horizontal_distortion, 0);

  vec2 color_sampling_offset = vec2(COLOR_SHIFT_DISTANCE / real_size.x, 0);
  vec4 color1 = texture(tex, texcoord + random_distortion - color_sampling_offset);
  vec4 color2 = texture(tex, texcoord + random_distortion                        );
  vec4 color3 = texture(tex, texcoord + random_distortion + color_sampling_offset);

  float scan_line_intensity =
    // -1.0 if the condition is false, 1.0 if it is true
    float(mod(texcoord_real.y, SCAN_LINES_HEIGHT * 2.0) >= SCAN_LINES_HEIGHT) * 2.0 - 1.0;

  out_color = vec4(
    vec3(color1.r, color2.g, color3.b) + vec3(
        sin(time * FLICKERING_TIME_FACTOR) * FLICKERING_RGB_RANGE
      + scan_line_intensity * SCAN_LINE_RGB_RANGE
      + refresh_line_intensity * REFRESH_LINE_RGB_RANGE
    ), color2.a
  );
}
