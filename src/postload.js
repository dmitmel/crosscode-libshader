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

/* global ig, sc */

import { WebGLRenderer } from './renderer.js';

/**
 * @param {string} vertexShaderSrc
 * @param {string} fragmentShaderSrc
 * @param {HTMLImageElement} lutTextureData
 */
export default function run(vertexShaderSrc, fragmentShaderSrc, lutTextureData) {
  ig.module('libshader')
    .requires(
      'impact.base.system',
      'dom.ready',
      'impact.base.game',
      'impact.base.input',
      'game.feature.control.control',
    )
    .defines(() => {
      ig.System.inject({
        webGLRenderer: null,

        resize(width, height, scale) {
          let { webGLRenderer } = this;
          if (webGLRenderer == null) {
            let canvasGL = ig.$new('canvas');
            canvasGL.width = width;
            canvasGL.height = height;

            let id = this.canvas.getAttribute('id');
            this.canvas.removeAttribute('id');
            canvasGL.setAttribute('id', id);
            this.inputDom.replaceChild(canvasGL, this.canvas);

            webGLRenderer = new WebGLRenderer(
              canvasGL,
              this,
              vertexShaderSrc,
              fragmentShaderSrc,
              lutTextureData,
            );
            this.webGLRenderer = webGLRenderer;
          }

          this.parent(width, height, scale);
          if (webGLRenderer != null) webGLRenderer.onResize();
        },

        setCanvasSize(width, height, hideBorder) {
          this.parent(width, height, hideBorder);
          let { webGLRenderer } = ig.system;
          if (webGLRenderer != null) webGLRenderer.onResize();
        },
      });

      ig.Game.inject({
        finalDraw() {
          this.parent();
          let { webGLRenderer } = ig.system;
          if (webGLRenderer != null) webGLRenderer.render();
        },
      });

      ig.Input.inject({
        mousemove(event) {
          let { webGLRenderer } = ig.system;
          if (webGLRenderer != null) {
            let { getMouseCoords } = ig.Input;

            getMouseCoords(this.mouse, event, webGLRenderer.canvas);
            webGLRenderer.transformScreenPoint(this.mouse);

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
