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

const SIZE_OF_FLOAT = 4;

export class WebGLRenderer {
  private readonly gl: WebGL2RenderingContext;

  private readonly textureUniform: WebGLUniformLocation;
  private readonly lutTextureUniform: WebGLUniformLocation;
  private readonly randomSeedUniform: WebGLUniformLocation;
  private readonly randomUniform: WebGLUniformLocation;
  private readonly timeUniform: WebGLUniformLocation;
  private readonly realSizeUniform: WebGLUniformLocation;
  private readonly mouseUniform: WebGLUniformLocation;
  private readonly contextScaleUniform: WebGLUniformLocation;

  private readonly canvasTexture: WebGLTexture;
  private readonly lutTexture: WebGLTexture;

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

    let vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSrc);
    let fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
    let program = this.createProgram(vertexShader, fragmentShader);
    gl.useProgram(program);

    let vertexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      // prettier-ignore
      new Float32Array([
        // x     y    u    v
          1.0,  1.0, 1.0, 0.0,
         -1.0,  1.0, 0.0, 0.0,
         -1.0, -1.0, 0.0, 1.0,

          1.0,  1.0, 1.0, 0.0,
          1.0, -1.0, 1.0, 1.0,
         -1.0, -1.0, 0.0, 1.0,
      ]),
      gl.STATIC_DRAW,
    );

    let positionAttrib = gl.getAttribLocation(program, 'a_position');
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 4 * SIZE_OF_FLOAT, 0);
    gl.enableVertexAttribArray(positionAttrib);

    let texcoordAttrib = gl.getAttribLocation(program, 'a_texcoord');
    gl.vertexAttribPointer(
      texcoordAttrib,
      2,
      gl.FLOAT,
      false,
      4 * SIZE_OF_FLOAT,
      2 * SIZE_OF_FLOAT,
    );
    gl.enableVertexAttribArray(texcoordAttrib);

    this.textureUniform = gl.getUniformLocation(program, 'u_tex')!;
    this.lutTextureUniform = gl.getUniformLocation(program, 'u_tex_lut')!;
    this.randomSeedUniform = gl.getUniformLocation(program, 'u_random_seed')!;
    this.randomUniform = gl.getUniformLocation(program, 'u_random')!;
    this.timeUniform = gl.getUniformLocation(program, 'u_time')!;
    this.realSizeUniform = gl.getUniformLocation(program, 'u_real_size')!;
    this.mouseUniform = gl.getUniformLocation(program, 'u_mouse')!;
    this.contextScaleUniform = gl.getUniformLocation(program, 'u_context_scale')!;

    gl.uniform1f(this.randomSeedUniform, Math.random());

    this.canvasTexture = this.createTexture();
    this.lutTexture = this.createTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lutTextureData);

    // NOTE: onResize doesn't need to be called in this constructor!
  }

  private compileShader(type: number, source: string): WebGLShader {
    let { gl } = this;
    let shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader)!);
    }
    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    let { gl } = this;
    let program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program)!);
    }
    return program;
  }

  private createTexture(): WebGLTexture {
    let { gl } = this;
    let texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
  }

  public render(): void {
    let { gl } = this;
    let canvas2D = this.system.canvas;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.canvasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas2D);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);

    gl.uniform1i(this.textureUniform, 0);
    gl.uniform1i(this.lutTextureUniform, 1);
    gl.uniform1f(this.timeUniform, ig.Timer.time);
    gl.uniform1f(this.randomUniform, Math.random());
    gl.uniform2f(this.realSizeUniform, canvas2D.width, canvas2D.height);
    gl.uniform2f(this.mouseUniform, sc.control.getMouseX(), sc.control.getMouseY());
    gl.uniform1f(this.contextScaleUniform, this.system.contextScale);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
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
