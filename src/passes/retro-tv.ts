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

import { Pass, PassResources } from './core.js';
import * as ngl from '../ngl/all.js';
import { GL } from '../ngl/core.js';
import { ImageResource, ResourceLoader, TextResource } from '../resources.js';
import { Renderer } from '../renderer.js';

export class RetroTVPassResources extends PassResources {
  public fragmentShaderSrc: TextResource;
  public lutTextureData: ImageResource;

  public constructor(loader: ResourceLoader) {
    super(loader);
    this.fragmentShaderSrc = loader.textResource('shaders/retro-tv.frag.glsl');
    this.lutTextureData = loader.imageResource('lut.png');
  }
}

export class RetroTVPass extends Pass<RetroTVPassResources> {
  public lutTexture: ngl.Texture2D;

  public uniformTexture!: ngl.Uniform;
  public uniformLutTexture!: ngl.Uniform;

  public constructor(renderer: Renderer, resources: RetroTVPassResources) {
    super(renderer, resources);
    let { gl } = renderer;

    this.lutTexture = ngl.Texture2D.easyCreate(gl).setData(
      ngl.TextureFormat.RGBA,
      resources.lutTextureData.data,
    );
  }

  public free(): void {
    super.free();
    this.lutTexture.free();
  }

  protected setupUniforms(): void {
    super.setupUniforms();
    this.uniformTexture = this.program.getUniform('u_tex');
    this.uniformLutTexture = this.program.getUniform('u_tex_lut');
  }

  public prepareToRender(inputTexture: ngl.Texture2D): void {
    super.prepareToRender();
    let { gl } = this.renderer;

    gl.activeTexture(GL.TEXTURE0);
    inputTexture.bind();
    this.uniformTexture.set1i(0);

    gl.activeTexture(GL.TEXTURE1);
    this.lutTexture.bind();
    this.uniformLutTexture.set1i(1);
  }
}
