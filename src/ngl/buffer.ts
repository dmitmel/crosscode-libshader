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

import { BindableObject, GL } from './core.js';

export class VertexBuffer implements BindableObject<WebGLBuffer> {
  public readonly handle: WebGLBuffer;
  public constructor(public readonly gl: GL) {
    let handle = gl.createBuffer();
    if (handle == null) throw new Error('Allocation failed');
    this.handle = handle;
  }

  public static easyCreate(gl: GL): VertexBuffer {
    return new VertexBuffer(gl).bind();
  }

  public free(): void {
    this.gl.deleteBuffer(this.handle);
    (this as { handle: unknown }).handle = null;
  }

  public bind(): this {
    this.gl.bindBuffer(GL.ARRAY_BUFFER, this.handle);
    return this;
  }

  public unbind(): void {
    this.gl.bindBuffer(GL.ARRAY_BUFFER, null);
  }

  public setData(data: BufferSource | null, usageHint: BufferUsageHint): this {
    this.gl.bufferData(GL.ARRAY_BUFFER, data, usageHint);
    return this;
  }

  public draw(primitive: DrawingPrimitive, offset: number, count: number): void {
    this.gl.drawArrays(primitive, offset, count);
  }
}

export enum BufferUsageHint {
  StaticDraw = GL.STATIC_DRAW,
  DynamicDraw = GL.DYNAMIC_DRAW,
  StreamDraw = GL.STREAM_DRAW,
}

export enum DrawingPrimitive {
  Points = GL.POINTS,
  LineStrip = GL.LINE_STRIP,
  LineLoop = GL.LINE_LOOP,
  LINES = GL.LINES,
  TriangleStrip = GL.TRIANGLE_STRIP,
  TriangleFan = GL.TRIANGLE_FAN,
  Triangles = GL.TRIANGLES,
}

export function setupVertexAttributePointers(
  gl: GL,
  config: Array<{ location: number; type: AttribDataType; length: number; normalize: boolean }>,
): void {
  let stride = 0;
  for (let attrib of config) {
    stride += AttribDataType.sizeOf(attrib.type) * attrib.length;
  }

  let offset = 0;
  for (let attrib of config) {
    let size = AttribDataType.sizeOf(attrib.type) * attrib.length;
    gl.vertexAttribPointer(
      attrib.location,
      attrib.length,
      attrib.type,
      attrib.normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(attrib.location);
    offset += size;
  }
}

export enum AttribDataType {
  Byte = GL.BYTE,
  UnsignedByte = GL.UNSIGNED_BYTE,
  Short = GL.SHORT,
  UnsignedShort = GL.UNSIGNED_SHORT,
  Float = GL.FLOAT,
}

export namespace AttribDataType {
  export function sizeOf(type: AttribDataType): number {
    switch (type) {
      case AttribDataType.Byte:
      case AttribDataType.UnsignedByte:
        return 1;
      case AttribDataType.Short:
      case AttribDataType.UnsignedShort:
        return 2;
      case AttribDataType.Float:
        return 4;
      default:
        throw new Error('No such AttribDataType');
    }
  }
}
