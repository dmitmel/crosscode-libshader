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
  public retroTVPassResources: RetroTVPassResources;
  public lutPassResources: LUTPassResources;

  public constructor(loader: ResourceLoader) {
    this.retroTVPassResources = new RetroTVPassResources(loader);
    this.lutPassResources = new LUTPassResources(loader);
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

  private readonly vertexBuffer: WebGLBuffer;
  private readonly canvasTexture: ngl.Texture2D;
  private readonly retroTVPass: RetroTVPass;
  private readonly lutPass: LUTPass;

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

    this.vertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(GL.ARRAY_BUFFER, FULLSCREEN_QUAD_VERTICES, GL.STATIC_DRAW);

    gl.vertexAttribPointer(
      VERTEX_ATTRIB_POSITION_LOCATION,
      2,
      GL.FLOAT,
      false,
      4 * ngl.SIZE_OF_FLOAT,
      0,
    );
    gl.enableVertexAttribArray(VERTEX_ATTRIB_POSITION_LOCATION);

    gl.vertexAttribPointer(
      VERTEX_ATTRIB_TEXCOORD_LOCATION,
      2,
      GL.FLOAT,
      false,
      4 * ngl.SIZE_OF_FLOAT,
      2 * ngl.SIZE_OF_FLOAT,
    );
    gl.enableVertexAttribArray(VERTEX_ATTRIB_TEXCOORD_LOCATION);

    this.retroTVPass = new RetroTVPass(this, resources.retroTVPassResources);
    this.lutPass = new LUTPass(this, resources.lutPassResources);

    this.canvasTexture = ngl.Texture2D.easyCreate(gl);

    // NOTE: onResize doesn't need to be called in this constructor!
  }

  public free(): void {
    this.retroTVPass.free();
    this.lutPass.free();
    this.gl.deleteBuffer(this.vertexBuffer);
    this.canvasTexture.free();
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

    this.retroTVPass.prepareToRender(this.canvasTexture);
    // this.lutPass.prepareToRender(this.canvasTexture);
    this.gl.drawArrays(GL.TRIANGLE_STRIP, 0, 4);
  }

  public transformScreenPoint(dest: Vec2): void {
    const SCREEN_CURVATURE = 0.2;

    let { x, y } = dest;
    let { screenWidth, screenHeight } = ig.system;
    x /= screenWidth;
    y /= screenHeight;

    let cx = 0.5 - x;
    let cy = 0.5 - y;
    let distortion = (cx * cx + cy * cy) * SCREEN_CURVATURE;
    dest.x = (x - cx * (1 + distortion) * distortion) * screenWidth;
    dest.y = (y - cy * (1 + distortion) * distortion) * screenHeight;
  }
}
