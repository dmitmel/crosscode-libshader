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
   * @returns {Promise<string>}
   */
  async readFile(url) {
    let response = await fetch('/' + this.baseDirectory + url);
    return await response.text();
  }

  /**
   * @param {string} url
   * @returns {Promise<HTMLImageElement>}
   */
  async loadImage(url) {
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.src = '/' + this.baseDirectory + url;
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image '${url}'`));
    });
  }

  async postload() {
    let [vertexShaderSrc, fragmentShaderSrc, lutTextureData] = await Promise.all([
      this.readFile('shader.vert'),
      this.readFile('shader.frag'),
      this.loadImage('lut.png'),
    ]);
    return runPostload(vertexShaderSrc, fragmentShaderSrc, lutTextureData);
  }
}
