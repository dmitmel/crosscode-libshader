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
import { Texture2D } from './texture.js';

export class Framebuffer implements BindableObject<WebGLFramebuffer> {
  public readonly handle: WebGLFramebuffer;
  public constructor(public readonly gl: GL) {
    let handle = gl.createFramebuffer();
    if (handle == null) throw new Error('Allocation failed');
    this.handle = handle;
  }

  public static easyCreate(gl: GL): Framebuffer {
    return new Framebuffer(gl).bind();
  }

  public free(): void {
    this.gl.deleteFramebuffer(this.handle);
    (this as { handle: unknown }).handle = null;
  }

  public bind(): this {
    this.gl.bindFramebuffer(GL.FRAMEBUFFER, this.handle);
    return this;
  }

  public unbind(): void {
    this.gl.bindFramebuffer(GL.FRAMEBUFFER, null);
  }

  public getStatus(): FramebufferStatus {
    return this.gl.checkFramebufferStatus(GL.FRAMEBUFFER);
  }

  public isComplete(): boolean {
    return this.getStatus() === FramebufferStatus.Complete;
  }

  public attachColorTexture2D(texture: Texture2D, index: number): this {
    this.gl.framebufferTexture2D(
      GL.FRAMEBUFFER,
      GL.COLOR_ATTACHMENT0 + index,
      GL.TEXTURE_2D,
      texture.handle,
      0,
    );
    return this;
  }
}

export enum FramebufferStatus {
  Complete = GL.FRAMEBUFFER_COMPLETE,
  IncompleteAttachment = GL.FRAMEBUFFER_INCOMPLETE_ATTACHMENT,
  IncompleteMissingAttachment = GL.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT,
  IncompleteDimensions = GL.FRAMEBUFFER_INCOMPLETE_DIMENSIONS,
  Unsupported = GL.FRAMEBUFFER_UNSUPPORTED,
}
