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

uniform sampler2D u_tex;
uniform sampler2D u_tex_lut;
uniform float u_random_seed;
uniform float u_random;
uniform float u_time;
uniform vec2 u_real_size;
uniform vec2 u_mouse;
uniform float u_context_scale;

in vec2 v_texcoord;
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

// taken from https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83#generic-123-noise
// NOTE: This function doesn't give apprently random results when `n` is changed
// in small increments
float simple_random(float n) {
  return fract(sin(n) * 43758.5453123);
}

float simple_random(vec2 n) {
  return simple_random(dot(n, vec2(12.9898, 4.1414)));
}

// taken from https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83#generic-123-noise
float simple_noise(float p) {
  float fl = floor(p);
  float fc = fract(p);
  return mix(simple_random(fl), simple_random(fl + 1.0), fc);
}

float normalized_to_range(float n, vec2 range) {
  float min = range.x;
  float max = range.y;
  return min + n * (max - min);
}

float clip_to_step(float n, float st) {
  return floor(n / st) * st;
}

const vec2 INTERNAL_SIZE = vec2(568.0, 320.0);

const float AMBIENT_LIGHT = 0.1;
const float COLOR_SHIFT_DISTANCE = 1.5 / INTERNAL_SIZE.x;
// slow eye burn mode:
// const float FLICKERING_RGB_RANGE = 3.0 / 255.0;
const float FLICKERING_RGB_RANGE = 0.0;
const float FLICKERING_TIME_FACTOR = 50.0;
const float REFRESH_LINE_SPEED = 5.0; // seconds per screen
const float REFRESH_LINE_TOTAL_HEIGHT = 1.25; // screens
const float REFRESH_LINE_RGB_RANGE = 25.0 / 255.0;
const float HORIZONTAL_DISTORTION_TIME_FACTOR = 10.0;
const float HORIZONTAL_DISTORTION_SECTION_HEIGHT = 2.0 / INTERNAL_SIZE.y; // pixels
const float HORIZONTAL_DISTORTION_MAX = 0.75 / INTERNAL_SIZE.x;
const float LARGE_HORIZONTAL_LAG_PROBABILITY = 0.05;
const float LARGE_HORIZONTAL_LAG_TIME_FACTOR = 1000.0;
const vec2 LARGE_HORIZONTAL_LAG_HEIGHT_RANGE = vec2(1.0, 4.0) / INTERNAL_SIZE;
const vec2 LARGE_HORIZONTAL_LAG_SLOPE_RANGE = vec2(0.5, 4.0);
const float SCAN_LINES_HEIGHT = 2.0 / INTERNAL_SIZE.y;
const float SCAN_LINE_RGB_RANGE = 5.0 / 255.0;
const float SCREEN_CURVATURE = 0.2;
const float SCREEN_FRAME_SHADOW_LENGTH = 0.5;
const vec4 SCREEN_FRAME_COLOR = vec4(vec3(1.0), 1.0);
const float NOISE_UPDATE_INTERVAL = 0.10;
const float NOISE_RGB_RANGE = 8.0 / 255.0;

const vec3 LUT_COLORS = vec3(32.0);
const float LUT_CONTRIBUTION = 1.0;
const vec2 LUT_SIZE = vec2(LUT_COLORS.r * LUT_COLORS.b, LUT_COLORS.g);
const vec3 LUT_MAX_COLOR = LUT_COLORS - 1.0;

// taken from https://github.com/Swordfish90/cool-retro-term/blob/f2f38c0e0d86a32766f6fe8fc6063f1d578b55de/app/qml/NewTerminalFrame.qml#L31-L35
// it's quite fascinating that a complex-looking transform that I want to get
// can be achieved with such a simple function AND no matricies whatsoever!
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
  vec2 aadelta = 1.0 / u_real_size;
  alpha = sum2(1.0 - smoothstep(vec2(0.0), aadelta, texcoord) + smoothstep(vec2(1.0) - aadelta, vec2(1.0), texcoord));
  alpha = clamp(alpha, 0.0, 1.0) * mix(1.0, 0.9, out_shadow);
  float in_shadow = 1.0 - mul2(smoothstep(0.0, in_shadow_length, texcoord) - smoothstep(1.0 - in_shadow_length, 1.0, texcoord));
  in_shadow = 0.5 * in_shadow * in_shadow;
  alpha = max(alpha, in_shadow);
  out_color = vec4(color * alpha, alpha);
}

// TODO: implement LUT color grading in a separate pass to reduce the number of lookups
vec4 apply_lut(in vec4 color) {
  color = clamp(color, 0.0, 1.0);

  vec2  lut_rg_pos = vec2(0.5) + color.rg * LUT_MAX_COLOR.rg;
  float lut_b_pos1 = floor(color.b * LUT_MAX_COLOR.b) * LUT_COLORS.b;
  float lut_b_pos2 =  ceil(color.b * LUT_MAX_COLOR.b) * LUT_COLORS.b;

  vec2 lut_pos1 = (lut_rg_pos + vec2(lut_b_pos1, 0.0)) / LUT_SIZE;
  vec2 lut_pos2 = (lut_rg_pos + vec2(lut_b_pos2, 0.0)) / LUT_SIZE;

  vec4 graded_color1 = texture(u_tex_lut, lut_pos1);
  vec4 graded_color2 = texture(u_tex_lut, lut_pos2);
  vec4 graded_color = mix(graded_color1, graded_color2, fract(color.b * LUT_MAX_COLOR.b));

  return graded_color;
}

vec4 get_pixel(vec2 pos) {
  if (pos.x < 0.0 || pos.y < 0.0 || pos.x > 1.0 || pos.y > 1.0) {
    return vec4(0.0, 0.0, 0.0, 1.0);
  }
  vec4 color = texture(u_tex, pos);
  return mix(color, apply_lut(color), LUT_CONTRIBUTION);
}

void main(void) {
  vec2 center_screen_coord = vec2(0.5) - v_texcoord;
  float distance_from_center = length(center_screen_coord);
  // NOTE: v_texcoord is a coordinate in the screen space!!!
  vec2 texcoord = apply_screen_curvature(v_texcoord);

  // can this be done without an `if`?
  if (texcoord.x < 0.0 || texcoord.y < 0.0 || texcoord.x > 1.0 || texcoord.y > 1.0) {
    draw_frame(texcoord);
    return;
  }

  // vec2 texcoord_real = texcoord * u_real_size;

  // vertical wave
  // float offset = (sin(texcoord_real.x / 40.0 + u_time * 4.0) * 10.0) / u_real_size.y;
  // out_color = texture(u_tex, v_texcoord + vec2(0, offset));

  // trip-shader (no mushrooms were involved!)
  // float p = distance(texcoord, u_mouse / INTERNAL_SIZE);
  // vec4 rainbow_color = vec4(hsv2rgb(vec3(p / 200.0 + u_time, 1.0, 1.0)), 1.0);
  // out_color = mix(texture(u_tex, v_texcoord), rainbow_color, 1.0 / 4.0);

  float refresh_line_intensity =
    fract((texcoord.y - u_time / REFRESH_LINE_SPEED) / REFRESH_LINE_TOTAL_HEIGHT);

  float horizontal_distortion = simple_noise(
      u_random_seed
    + u_time * HORIZONTAL_DISTORTION_TIME_FACTOR
    + 13074.930928 * clip_to_step(texcoord.y, HORIZONTAL_DISTORTION_SECTION_HEIGHT)
  ) * HORIZONTAL_DISTORTION_MAX;

  float large_horizontal_lag_location =
    simple_random(u_random * 187.802597 + 46256.998768) /
    LARGE_HORIZONTAL_LAG_PROBABILITY;
  float large_horizontal_lag_height = normalized_to_range(
    simple_random(u_random * 96.485718 + 20162.228449),
    LARGE_HORIZONTAL_LAG_HEIGHT_RANGE
  );
  float large_horizontal_lag_slope = normalized_to_range(
    simple_random(u_random * 211.777528 + 12306.323303),
    LARGE_HORIZONTAL_LAG_SLOPE_RANGE
  );

  // TODO: fix on Intel GPUs
  float large_horizontal_lag =
    large_horizontal_lag_height - distance(texcoord.y, large_horizontal_lag_location);
  float large_horizontal_lag_distortion =
    // `step` acts here as a branchless comparison of `large_horizontal_lag` with 0
    step(0.0, large_horizontal_lag) * large_horizontal_lag_slope * large_horizontal_lag;

  float scan_line_intensity =
    // -1.0 if the condition is false, 1.0 if it is true
    float(mod(texcoord.y, SCAN_LINES_HEIGHT * 2.0) >= SCAN_LINES_HEIGHT) * 2.0 - 1.0;

  float noise_intensity = simple_random(
    floor(texcoord * INTERNAL_SIZE) +
    vec2(u_random_seed + clip_to_step(u_time, NOISE_UPDATE_INTERVAL))
  ) * 2.0 - 1.0;

  texcoord.x += horizontal_distortion - large_horizontal_lag_distortion;

  vec2 color_sampling_offset = vec2(COLOR_SHIFT_DISTANCE, 0);
  vec4 color1 = get_pixel(texcoord - color_sampling_offset);
  vec4 color2 = get_pixel(texcoord                        );
  vec4 color3 = get_pixel(texcoord + color_sampling_offset);

  vec3 out_color_rgb = vec3(color1.r, color2.g, color3.b) + vec3(
      sin(u_time * FLICKERING_TIME_FACTOR) * FLICKERING_RGB_RANGE
    + scan_line_intensity * SCAN_LINE_RGB_RANGE
    + refresh_line_intensity * REFRESH_LINE_RGB_RANGE
    // implementation of ambient light was taken from https://github.com/Swordfish90/cool-retro-term/blob/f2f38c0e0d86a32766f6fe8fc6063f1d578b55de/app/qml/ShaderTerminal.qml#L299-L303
    + AMBIENT_LIGHT * pow(1.0 - distance_from_center, 2.0)
    + noise_intensity * NOISE_RGB_RANGE
  );

  out_color = vec4(out_color_rgb, color2.a);
}
