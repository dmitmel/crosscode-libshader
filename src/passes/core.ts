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

import * as ngl from '../ngl/all.js';
import { Renderer } from '../renderer.js';
import { ResourceLoader, TextResource } from '../resources.js';

export abstract class PassResources {
  public vertexShaderSrc: TextResource;
  public abstract fragmentShaderSrc: TextResource;

  public constructor(loader: ResourceLoader) {
    this.vertexShaderSrc = loader.textResource('shaders/default.vert.glsl');
  }
}

export const VERTEX_ATTRIB_POSITION_LOCATION = 0;
export const VERTEX_ATTRIB_TEXCOORD_LOCATION = 1;

export abstract class Pass<R extends PassResources> {
  public readonly program: ngl.Program;
  public randomSeedUniform!: ngl.Uniform;
  public uniformRandom!: ngl.Uniform;
  public uniformTime!: ngl.Uniform;
  public uniformSize!: ngl.Uniform;
  public uniformRealSize!: ngl.Uniform;
  public uniformMouse!: ngl.Uniform;
  public uniformContextScale!: ngl.Uniform;

  public constructor(public readonly renderer: Renderer, public resources: R) {
    let { gl } = renderer;

    let vertexShader = ngl.Shader.easyCreate(
      gl,
      ngl.ShaderType.Vertex,
      resources.vertexShaderSrc.data,
    );
    let fragmentShader = ngl.Shader.easyCreate(
      gl,
      ngl.ShaderType.Fragment,
      resources.fragmentShaderSrc.data,
    );

    this.program = ngl.Program.easyCreate(gl, vertexShader, fragmentShader, (program) => {
      program
        .requestAttributeLocation('a_position', VERTEX_ATTRIB_POSITION_LOCATION)
        .requestAttributeLocation('a_texcoord', VERTEX_ATTRIB_TEXCOORD_LOCATION);
    });

    vertexShader.free();
    fragmentShader.free();

    this.setupUniforms();
  }

  public free(): void {
    this.program.free();
  }

  protected setupUniforms(): void {
    this.randomSeedUniform = this.program.getUniform('u_random_seed').set1f(Math.random());
    this.uniformRandom = this.program.getUniform('u_random');
    this.uniformTime = this.program.getUniform('u_time');
    this.uniformSize = this.program.getUniform('u_size');
    this.uniformRealSize = this.program.getUniform('u_real_size');
    this.uniformMouse = this.program.getUniform('u_mouse');
    this.uniformContextScale = this.program.getUniform('u_context_scale');
  }

  public prepareToRender(..._args: unknown[]): void {
    let { canvas } = this.renderer;

    this.program.bind();
    this.uniformTime.set1f(ig.Timer.time);
    this.uniformRandom.set1f(Math.random());
    this.uniformSize.set2f(ig.system.width, ig.system.height);
    this.uniformRealSize.set2f(canvas.width, canvas.height);
    this.uniformMouse.set2f(sc.control.getMouseX(), sc.control.getMouseY());
    this.uniformContextScale.set1f(ig.system.contextScale);
  }

  public transformScreenPoint(dest: Vec2): Vec2 {
    return dest;
  }
}
