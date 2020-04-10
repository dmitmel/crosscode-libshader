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

import runPostload from './postload.js';

export default class LibshaderPlugin extends Plugin {
  constructor(mod) {
    super(mod);
    this.baseDirectory = mod.baseDirectory;
  }

  /**
   * @param {string} url
   * @returns {string}
   */
  async readModFile(url) {
    let response = await fetch('/' + this.baseDirectory + url);
    return await response.text();
  }

  async postload() {
    let [vertexShaderSrc, fragmentShaderSrc] = await Promise.all([
      this.readModFile('shader.vert'),
      this.readModFile('shader.frag'),
    ]);
    return runPostload(vertexShaderSrc, fragmentShaderSrc);
  }
}
