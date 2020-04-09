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
