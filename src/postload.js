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

/* global ig */

import { Renderer } from './renderer.js';

/**
 * @param {import('./renderer').RendererResources} rendererResources
 */
export function inject(rendererResources) {
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

        // NOTE: resize is always called in the constructor of ig.System
        resize(width, height, scale) {
          if (this.webGLRenderer == null) {
            this.webGLRenderer = new Renderer(rendererResources, this.canvas);
          }
          this.parent(width, height, scale);
          this.webGLRenderer.onResize(this.screenWidth, this.screenHeight);
        },

        setCanvasSize(width, height, hideBorder) {
          this.parent(width, height, hideBorder);
          this.webGLRenderer.onResize(this.screenWidth, this.screenHeight);
        },
      });

      ig.Game.inject({
        finalDraw() {
          this.parent();
          ig.system.webGLRenderer.render();
        },
      });

      // ig.Input is created after ig.System, so ig.system can be assumed to exist
      ig.Input.inject({
        mousemove(event) {
          let { getMouseCoords } = ig.Input;

          try {
            getMouseCoords(this.mouse, event, ig.system.webGLRenderer.canvas);
            ig.system.webGLRenderer.transformScreenPoint(this.mouse);

            ig.Input.getMouseCoords = () => {
              // skip the first call, which is the only one
              ig.Input.getMouseCoords = getMouseCoords;
            };

            this.parent(event);
          } finally {
            ig.Input.getMouseCoords = getMouseCoords;
          }
        },
      });
    });
}
