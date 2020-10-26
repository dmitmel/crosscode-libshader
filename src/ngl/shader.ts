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

import { BindableObject, GL, ManagedObject } from './core.js';
import { Texture2D } from './texture.js';

export enum ShaderType {
  Vertex = GL.VERTEX_SHADER,
  Fragment = GL.FRAGMENT_SHADER,
}

export class Shader implements ManagedObject<WebGLShader> {
  public readonly handle: WebGLShader;
  public constructor(public readonly gl: GL, public readonly type: ShaderType) {
    let handle = gl.createShader(type);
    if (handle == null) throw new Error('Allocation failed');
    this.handle = handle;
  }

  public static easyCreate(
    gl: GL,
    type: ShaderType,
    source: string,
    configureBeforeCompilation?: ((shader: Shader) => void) | null,
  ): Shader {
    let shader = new Shader(gl, type).setSource(source);
    configureBeforeCompilation?.(shader);
    if (!shader.compile()) {
      let log = shader.getInfoLog()!;
      shader.free();
      throw new Error(log);
    }
    return shader;
  }

  public free(): void {
    this.gl.deleteShader(this.handle);
    (this as { handle: unknown }).handle = null;
  }

  public setSource(source: string): this {
    this.gl.shaderSource(this.handle, source);
    return this;
  }

  public compile(): boolean {
    this.gl.compileShader(this.handle);
    return this.gl.getShaderParameter(this.handle, GL.COMPILE_STATUS);
  }

  public getInfoLog(): string | null {
    return this.gl.getShaderInfoLog(this.handle);
  }
}

export class Program implements BindableObject<WebGLProgram> {
  public readonly handle: WebGLProgram;
  public constructor(public readonly gl: GL) {
    let handle = gl.createProgram();
    if (handle == null) throw new Error('Allocation failed');
    this.handle = handle;
  }

  public static easyCreate(
    gl: GL,
    vertexShader: Shader,
    fragmentShader: Shader,
    configureBeforeLinking?: ((program: Program) => void) | null,
  ): Program {
    let program = new Program(gl).attachShader(vertexShader).attachShader(fragmentShader);
    configureBeforeLinking?.(program);
    if (!program.link()) {
      let log = program.getInfoLog()!;
      program.free();
      throw new Error(log);
    }
    program.detachShader(vertexShader).detachShader(fragmentShader);
    return program.bind();
  }

  public free(): void {
    this.gl.deleteProgram(this.handle);
    (this as { handle: unknown }).handle = null;
  }

  public bind(): this {
    this.gl.useProgram(this.handle);
    return this;
  }

  public unbind(): void {
    this.gl.useProgram(null);
  }

  public attachShader(shader: Shader): this {
    this.gl.attachShader(this.handle, shader.handle);
    return this;
  }

  public detachShader(shader: Shader): this {
    this.gl.detachShader(this.handle, shader.handle);
    return this;
  }

  public requestAttributeLocation(name: string, location: number): this {
    this.gl.bindAttribLocation(this.handle, location, name);
    return this;
  }

  public link(): boolean {
    this.gl.linkProgram(this.handle);
    return this.gl.getProgramParameter(this.handle, GL.LINK_STATUS);
  }

  public getInfoLog(): string | null {
    return this.gl.getProgramInfoLog(this.handle);
  }

  public getUniform(name: string): Uniform {
    return new Uniform(this.gl, this.gl.getUniformLocation(this.handle, name));
  }

  public getAttribute(name: string): number {
    return this.gl.getAttribLocation(this.handle, name);
  }
}

export class Uniform {
  public constructor(
    public readonly gl: GL,
    public readonly location: WebGLUniformLocation | null,
  ) {}

  public set1i(x: number): this {
    this.gl.uniform1i(this.location, x);
    return this;
  }

  public set1f(x: number): this {
    this.gl.uniform1f(this.location, x);
    return this;
  }

  public set2f(x: number, y: number): this {
    this.gl.uniform2f(this.location, x, y);
    return this;
  }

  public setTexture2D(texture2D: Texture2D, unit: number): this {
    texture2D.bindToUnit(unit);
    return this.set1i(unit);
  }
}
