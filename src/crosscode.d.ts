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

// ultimate-crosscode-typedefs are not used due to compilation speed concerns

import { Renderer } from './renderer';

export {};

declare global {
  interface Vec2 {
    x: number;
    y: number;
  }

  namespace ig {
    class System {
      canvas: HTMLCanvasElement;
      webGLRenderer: Renderer;
      width: number;
      height: number;
      contextScale: number;
      screenWidth: number;
      screenHeight: number;
    }
    var system: System;

    class Timer {
      static time: number;
    }

    class Input {
      static getMouseCoords(outVec2: Vec2, event: MouseEvent, element: HTMLElement): void;
    }
  }

  namespace sc {
    class Control {
      getMouseX(): number;
      getMouseY(): number;
    }
    var control: Control;
  }
}
