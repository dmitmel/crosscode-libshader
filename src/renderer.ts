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

import * as ngl from './ngl/all.js';
import { GL } from './ngl/core.js';
import { ResourceLoader } from './resources.js';
import { VERTEX_ATTRIB_POSITION_LOCATION, VERTEX_ATTRIB_TEXCOORD_LOCATION } from './passes/core.js';
import { RetroTVPass, RetroTVPassResources } from './passes/retro-tv.js';
import { LUTPass, LUTPassResources } from './passes/lut.js';

export class RendererResources {
  public lutPassResources: LUTPassResources;
  public retroTVPassResources: RetroTVPassResources;

  public constructor(loader: ResourceLoader) {
    this.lutPassResources = new LUTPassResources(loader);
    this.retroTVPassResources = new RetroTVPassResources(loader);
  }
}

// prettier-ignore
const FULLSCREEN_QUAD_VERTICES = new Float32Array([
  // x     y    u    v
    1.0,  1.0, 1.0, 0.0,
   -1.0,  1.0, 0.0, 0.0,
    1.0, -1.0, 1.0, 1.0,
   -1.0, -1.0, 0.0, 1.0,
]);

export class Renderer {
  public readonly canvas: HTMLCanvasElement;
  public readonly gl: GL;
  public readonly canvas2D: HTMLCanvasElement;

  private readonly vertexBuffer: ngl.VertexBuffer;
  private readonly canvasTexture: ngl.Texture2D;
  private readonly lutPass: LUTPass;
  private readonly retroTVPass: RetroTVPass;

  public constructor(resources: RendererResources, canvas2D: HTMLCanvasElement) {
    this.canvas2D = canvas2D;

    this.canvas = document.createElement('canvas');
    this.canvas.width = canvas2D.width;
    this.canvas.height = canvas2D.height;
    let gl = this.canvas.getContext('webgl2');
    if (gl == null) throw new Error('Failed to initialize WebGL2 context');
    this.gl = gl;

    let id = canvas2D.getAttribute('id') ?? 'canvas';
    canvas2D.removeAttribute('id');
    this.canvas.setAttribute('id', id);
    canvas2D.replaceWith(this.canvas);

    this.vertexBuffer = ngl.VertexBuffer.easyCreate(gl).setData(
      FULLSCREEN_QUAD_VERTICES,
      ngl.BufferUsageHint.StaticDraw,
    );

    ngl.setupVertexAttributePointers(gl, [
      {
        location: VERTEX_ATTRIB_POSITION_LOCATION,
        type: ngl.AttribDataType.Float,
        length: 2,
        normalize: false,
      },
      {
        location: VERTEX_ATTRIB_TEXCOORD_LOCATION,
        type: ngl.AttribDataType.Float,
        length: 2,
        normalize: false,
      },
    ]);

    this.lutPass = new LUTPass(this, resources.lutPassResources);
    this.retroTVPass = new RetroTVPass(this, resources.retroTVPassResources);

    this.canvasTexture = ngl.Texture2D.easyCreate(gl);

    // NOTE: onResize doesn't need to be called in this constructor!
  }

  public free(): void {
    this.retroTVPass.free();
    this.lutPass.free();
    this.canvasTexture.free();
    this.vertexBuffer.free();
  }

  public onResize(screenWidth: number, screenHeight: number): void {
    let { canvas2D, canvas: canvasGL } = this;
    canvasGL.width = canvas2D.width;
    canvasGL.height = canvas2D.height;
    canvasGL.style.width = `${screenWidth}px`;
    canvasGL.style.height = `${screenHeight}px`;
    this.gl.viewport(0, 0, canvasGL.width, canvasGL.height);
  }

  public render(): void {
    this.canvasTexture.bind().setData(ngl.TextureFormat.RGBA, this.canvas2D);
    this.vertexBuffer.bind();

    // this.lutPass.prepareToRender(this.canvasTexture);
    this.retroTVPass.prepareToRender(this.canvasTexture);
    this.vertexBuffer.draw(ngl.DrawingPrimitive.TriangleStrip, 0, 4);
  }

  public transformScreenPoint(dest: Vec2): Vec2 {
    dest = this.lutPass.transformScreenPoint(dest);
    dest = this.retroTVPass.transformScreenPoint(dest);
    return dest;
  }
}
