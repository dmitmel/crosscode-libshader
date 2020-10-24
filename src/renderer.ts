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

export class WebGLRenderer {
  private readonly gl: GL;

  private readonly program: ngl.Program;
  private readonly textureUniform: ngl.Uniform;
  private readonly lutTextureUniform: ngl.Uniform;
  private readonly randomSeedUniform: ngl.Uniform;
  private readonly randomUniform: ngl.Uniform;
  private readonly timeUniform: ngl.Uniform;
  private readonly sizeUniform: ngl.Uniform;
  private readonly realSizeUniform: ngl.Uniform;
  private readonly mouseUniform: ngl.Uniform;
  private readonly contextScaleUniform: ngl.Uniform;

  private readonly vertexBuffer: WebGLBuffer;

  private readonly canvasTexture: ngl.Texture2D;
  private readonly lutTexture: ngl.Texture2D;

  public constructor(
    public readonly canvas: HTMLCanvasElement,
    public readonly system: ig.System,
    vertexShaderSrc: string,
    fragmentShaderSrc: string,
    lutTextureData: HTMLImageElement,
  ) {
    let gl = canvas.getContext('webgl2');
    if (gl == null) throw new Error('Failed to initialize WebGL2 context');
    this.gl = gl;

    let vertexShader = ngl.Shader.easyCreate(this.gl, ngl.ShaderType.Vertex, vertexShaderSrc);
    let fragmentShader = ngl.Shader.easyCreate(this.gl, ngl.ShaderType.Fragment, fragmentShaderSrc);
    this.program = ngl.Program.easyCreate(this.gl, vertexShader, fragmentShader);
    vertexShader.free();
    fragmentShader.free();
    this.program.bind();

    this.vertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(
      GL.ARRAY_BUFFER,
      // prettier-ignore
      new Float32Array([
        // x     y    u    v
          1.0,  1.0, 1.0, 0.0,
         -1.0,  1.0, 0.0, 0.0,
          1.0, -1.0, 1.0, 1.0,
         -1.0, -1.0, 0.0, 1.0,
      ]),
      GL.STATIC_DRAW,
    );

    let positionAttrib = this.program.getAttribute('a_position');
    gl.vertexAttribPointer(positionAttrib, 2, GL.FLOAT, false, 4 * ngl.SIZE_OF_FLOAT, 0);
    gl.enableVertexAttribArray(positionAttrib);

    let texcoordAttrib = this.program.getAttribute('a_texcoord');
    gl.vertexAttribPointer(
      texcoordAttrib,
      2,
      GL.FLOAT,
      false,
      4 * ngl.SIZE_OF_FLOAT,
      2 * ngl.SIZE_OF_FLOAT,
    );
    gl.enableVertexAttribArray(texcoordAttrib);

    this.textureUniform = this.program.getUniform('u_tex');
    this.lutTextureUniform = this.program.getUniform('u_tex_lut');
    this.randomSeedUniform = this.program.getUniform('u_random_seed').set1f(Math.random());
    this.randomUniform = this.program.getUniform('u_random');
    this.timeUniform = this.program.getUniform('u_time');
    this.sizeUniform = this.program.getUniform('u_size');
    this.realSizeUniform = this.program.getUniform('u_real_size');
    this.mouseUniform = this.program.getUniform('u_mouse');
    this.contextScaleUniform = this.program.getUniform('u_context_scale');

    this.canvasTexture = ngl.Texture2D.easyCreate(gl);
    this.lutTexture = ngl.Texture2D.easyCreate(gl).setData(ngl.TextureFormat.RGBA, lutTextureData);

    // NOTE: onResize doesn't need to be called in this constructor!
  }

  public free(): void {
    this.program.free();
    this.gl.deleteBuffer(this.vertexBuffer);
    this.canvasTexture.free();
    this.lutTexture.free();
  }

  public render(): void {
    let { gl } = this;
    let canvas2D = this.system.canvas;

    gl.activeTexture(GL.TEXTURE0);
    this.canvasTexture.bind().setData(ngl.TextureFormat.RGBA, canvas2D);

    gl.activeTexture(GL.TEXTURE1);
    this.lutTexture.bind();

    this.textureUniform.set1i(0);
    this.lutTextureUniform.set1i(1);
    this.timeUniform.set1f(ig.Timer.time);
    this.randomUniform.set1f(Math.random());
    this.sizeUniform.set2f(ig.system.width, ig.system.height);
    this.realSizeUniform.set2f(canvas2D.width, canvas2D.height);
    this.mouseUniform.set2f(sc.control.getMouseX(), sc.control.getMouseY());
    this.contextScaleUniform.set1f(this.system.contextScale);

    gl.drawArrays(GL.TRIANGLE_STRIP, 0, 4);
  }

  public onResize(): void {
    let canvasGL = this.canvas;
    let canvas2D = this.system.canvas;
    canvasGL.width = canvas2D.width;
    canvasGL.height = canvas2D.height;
    canvasGL.style.width = `${this.system.screenWidth}px`;
    canvasGL.style.height = `${this.system.screenHeight}px`;
    this.gl.viewport(0, 0, canvasGL.width, canvasGL.height);
  }

  public transformScreenPoint(dest: Vec2): void {
    const SCREEN_CURVATURE = 0.2;

    let { x, y } = dest;
    let { screenWidth, screenHeight } = this.system;
    x /= screenWidth;
    y /= screenHeight;

    let cx = 0.5 - x;
    let cy = 0.5 - y;
    let distortion = (cx * cx + cy * cy) * SCREEN_CURVATURE;
    dest.x = (x - cx * (1 + distortion) * distortion) * screenWidth;
    dest.y = (y - cy * (1 + distortion) * distortion) * screenHeight;
  }
}
