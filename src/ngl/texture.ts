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

import { BindableObject, GL } from './core.js';

export class Texture2D implements BindableObject<WebGLTexture> {
  public readonly handle: WebGLTexture;
  public constructor(public readonly gl: GL) {
    let handle = gl.createTexture();
    if (handle == null) throw new Error('Allocation failed');
    this.handle = handle;
  }

  public static easyCreate(
    gl: GL,
    filter: TextureFilter = TextureFilter.Linear,
    wrappingMode: TextureWrappingMode = TextureWrappingMode.ClampToEdge,
  ): Texture2D {
    return new Texture2D(gl)
      .bind()
      .setFilters(filter)
      .setWrappingModes(wrappingMode);
  }

  public free(): void {
    this.gl.deleteTexture(this.handle);
    (this as { handle: unknown }).handle = null;
  }

  public bind(): this {
    this.gl.bindTexture(GL.TEXTURE_2D, this.handle);
    return this;
  }

  public bindToUnit(unit: number): this {
    this.gl.activeTexture(GL.TEXTURE0 + unit);
    return this.bind();
  }

  public unbind(): void {
    this.gl.bindTexture(GL.TEXTURE_2D, null);
  }

  public setWrappingModes(mode: TextureWrappingMode): this {
    this.gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, mode);
    this.gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, mode);
    return this;
  }

  public setFilters(filter: TextureFilter): this {
    this.gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, filter);
    this.gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, filter);
    return this;
  }

  public setData(format: TextureFormat, source: TexImageSource): this {
    this.gl.texImage2D(GL.TEXTURE_2D, 0, format, format, GL.UNSIGNED_BYTE, source);
    return this;
  }

  public reserveData(format: TextureFormat, width: number, height: number): this {
    this.gl.texImage2D(GL.TEXTURE_2D, 0, format, width, height, 0, format, GL.UNSIGNED_BYTE, null);
    return this;
  }
}

export enum TextureWrappingMode {
  ClampToEdge = GL.CLAMP_TO_EDGE,
  MirroredRepeat = GL.MIRRORED_REPEAT,
  Repeat = GL.REPEAT,
}

export enum TextureFilter {
  Linear = GL.LINEAR,
  Nearest = GL.NEAREST,
}

export enum TextureFormat {
  RGB = GL.RGB,
  RGBA = GL.RGBA,
  L = GL.LUMINANCE,
  LA = GL.LUMINANCE_ALPHA,
}
