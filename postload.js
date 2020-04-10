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

export default function run(vertexShaderSrc, fragmentShaderSrc) {
  ig.module('libshader')
    .requires(
      'impact.base.system',
      'dom.ready',
      'impact.base.game',
      'impact.base.input',
      'game.feature.control.control',
    )
    .defines(() => {
      const SIZE_OF_FLOAT = 4;

      class WebGLRenderer {
        /**
         * @param {ig.System} system
         */
        constructor(system) {
          this.system = system;

          this.gl = this.system.canvasGL.getContext('webgl2');
          let { gl } = this;

          let vertexShader = this.compileShader(
            gl.VERTEX_SHADER,
            vertexShaderSrc,
          );

          let fragmentShader = this.compileShader(
            gl.FRAGMENT_SHADER,
            fragmentShaderSrc,
          );

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

          let positionAttrib = gl.getAttribLocation(program, 'position');
          gl.vertexAttribPointer(
            positionAttrib,
            2,
            gl.FLOAT,
            false,
            4 * SIZE_OF_FLOAT,
            0,
          );
          gl.enableVertexAttribArray(positionAttrib);

          let texcoordAttrib = gl.getAttribLocation(program, 'texcoord');
          gl.vertexAttribPointer(
            texcoordAttrib,
            2,
            gl.FLOAT,
            false,
            4 * SIZE_OF_FLOAT,
            2 * SIZE_OF_FLOAT,
          );
          gl.enableVertexAttribArray(texcoordAttrib);

          this.textureUniform = gl.getUniformLocation(program, 'tex');
          this.randomSeedUniform = gl.getUniformLocation(
            program,
            'random_seed',
          );
          this.randomUniform = gl.getUniformLocation(program, 'random');
          this.timeUniform = gl.getUniformLocation(program, 'time');
          this.realSizeUniform = gl.getUniformLocation(program, 'real_size');
          this.mouseUniform = gl.getUniformLocation(program, 'mouse');
          this.contextScaleUniform = gl.getUniformLocation(
            program,
            'context_scale',
          );

          if (this.randomSeedUniform != null) {
            gl.uniform1f(this.randomSeedUniform, Math.random());
          }

          this.texture = this.createTexture(gl.TEXTURE0);
        }

        compileShader(type, source) {
          let { gl } = this;
          let shader = gl.createShader(type);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
          }
          return shader;
        }

        createProgram(vertexShader, fragmentShader) {
          let { gl } = this;
          let program = gl.createProgram();
          gl.attachShader(program, vertexShader);
          gl.attachShader(program, fragmentShader);
          gl.linkProgram(program);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(program));
          }
          return program;
        }

        createTexture(unit) {
          let { gl } = this;
          let texture = gl.createTexture();
          gl.activeTexture(unit);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          return texture;
        }

        render() {
          let { gl } = this;

          if (this.textureUniform != null) {
            gl.uniform1i(this.textureUniform, this.texture);
          }
          if (this.timeUniform != null) {
            gl.uniform1f(this.timeUniform, ig.Timer.time);
          }
          if (this.randomUniform != null) {
            gl.uniform1f(this.randomUniform, Math.random());
          }
          if (this.realSizeUniform != null) {
            gl.uniform2f(
              this.realSizeUniform,
              this.system.canvas.width,
              this.system.canvas.height,
            );
          }
          if (this.mouseUniform != null) {
            gl.uniform2f(
              this.mouseUniform,
              sc.control.getMouseX(),
              sc.control.getMouseY(),
            );
          }
          if (this.contextScaleUniform != null) {
            gl.uniform1f(this.contextScaleUniform, this.system.contextScale);
          }

          gl.bindTexture(gl.TEXTURE_2D, this.texture);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            this.system.canvas,
          );

          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        onResize() {
          let { canvas: canvas2D, canvasGL } = this.system;
          canvasGL.width = canvas2D.width;
          canvasGL.height = canvas2D.height;
          canvasGL.style.width = `${this.system.screenWidth}px`;
          canvasGL.style.height = `${this.system.screenHeight}px`;
          this.gl.viewport(0, 0, canvasGL.width, canvasGL.height);
        }

        transformScreenPoint(dest) {
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

      ig.System.inject({
        webGLRenderer: null,

        resize(width, height, scale) {
          if (this.webGLRenderer == null) {
            this.canvasGL = ig.$new('canvas');
            this.canvasGL.width = width;
            this.canvasGL.height = height;

            this.canvas.removeAttribute('id');
            this.canvasGL.id = 'canvas';
            this.inputDom.replaceChild(this.canvasGL, this.canvas);

            this.webGLRenderer = new WebGLRenderer(this);
          }

          this.parent(width, height, scale);
          if (this.webGLRenderer != null) {
            this.webGLRenderer.onResize();
          }
        },

        setCanvasSize(width, height, hideBorder) {
          this.parent(width, height, hideBorder);
          if (this.webGLRenderer != null) {
            this.webGLRenderer.onResize();
          }
        },
      });

      ig.Game.inject({
        finalDraw() {
          this.parent();
          if (ig.system.webGLRenderer != null) ig.system.webGLRenderer.render();
        },
      });

      ig.Input.inject({
        mousemove(event) {
          if (ig.system.webGLRenderer != null) {
            let { getMouseCoords } = ig.Input;

            getMouseCoords(this.mouse, event, ig.system.canvasGL);
            ig.system.webGLRenderer.transformScreenPoint(this.mouse);

            ig.Input.getMouseCoords = () => {
              // skip the first call, which is the only one
              ig.Input.getMouseCoords = getMouseCoords;
            };

            this.parent(event);
            ig.Input.getMouseCoords = getMouseCoords;
          } else {
            this.parent(event);
          }
        },
      });
    });
}
