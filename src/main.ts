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

import * as postload from './postload.js';
import { RendererResources } from './renderer.js';
import { ResourceLoader } from './resources.js';

export default class LibshaderPlugin {
  public baseDir: string;

  public constructor(mod: { baseDirectory: string }) {
    this.baseDir = mod.baseDirectory;
  }

  public async postload(): Promise<void> {
    let loader = new ResourceLoader();
    let resources = new RendererResources(loader);
    await loader.loadAll(this.baseDir);
    return postload.inject(resources);
  }
}
