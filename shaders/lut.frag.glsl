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

const vec3 LUT_COLORS = vec3(32.0);
const float LUT_CONTRIBUTION = 1.0;
const vec2 LUT_SIZE = vec2(LUT_COLORS.r * LUT_COLORS.b, LUT_COLORS.g);
const vec3 LUT_MAX_COLOR = LUT_COLORS - 1.0;

uniform sampler2D u_tex;
uniform sampler2D u_tex_lut;

in vec2 v_texcoord;
out vec4 out_color;

void main(void) {
  vec4 color = clamp(texture(u_tex, v_texcoord), 0.0, 1.0);

  vec2  lut_rg_pos = vec2(0.5) + color.rg * LUT_MAX_COLOR.rg;
  float lut_slice  = color.b * LUT_MAX_COLOR.b;
  float lut_b_pos1 = floor(lut_slice) * LUT_COLORS.b;
  float lut_b_pos2 =  ceil(lut_slice) * LUT_COLORS.b;

  vec2 lut_pos1 = (lut_rg_pos + vec2(lut_b_pos1, 0.0)) / LUT_SIZE;
  vec2 lut_pos2 = (lut_rg_pos + vec2(lut_b_pos2, 0.0)) / LUT_SIZE;

  vec4 graded_color1 = texture(u_tex_lut, lut_pos1);
  vec4 graded_color2 = texture(u_tex_lut, lut_pos2);
  vec4 graded_color = mix(graded_color1, graded_color2, fract(lut_slice));

  out_color = mix(color, graded_color, LUT_CONTRIBUTION);
}
