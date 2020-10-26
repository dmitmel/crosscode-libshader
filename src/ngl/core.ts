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

export type GL = WebGL2RenderingContext;
export const GL = WebGL2RenderingContext;

export interface ManagedObject<O extends WebGLObject> {
  handle: O;
  gl: GL;
  free(): void;
}

export interface BindableObject<O extends WebGLObject> extends ManagedObject<O> {
  bind(): void;
  unbind(): void;
}

declare global {
  // Because WebGL types are presumably "opaque", they are represented as
  // basically empty objects, which makes any type assignable to them. I fix
  // this by adding an intrinsic property to WebGLObjects which hopefully isn't
  // available anywhere else. The next step which can be taken is to add such
  // intrinsic properties to every concrete WebGL type which inherits from
  // WebGLObject to make them not assignable to each other.
  interface WebGLObject {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __WebGLObject__: never;
  }
}
