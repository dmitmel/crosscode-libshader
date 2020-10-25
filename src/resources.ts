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

export class ResourceLoader {
  public textResources = new Map<string, TextResource>();
  public imageResources = new Map<string, ImageResource>();

  public textResource(path: string): TextResource {
    let res = this.textResources.get(path);
    if (res == null) {
      res = new TextResource(path);
      this.textResources.set(path, res);
    }
    return res;
  }

  public imageResource(path: string): ImageResource {
    let res = this.imageResources.get(path);
    if (res == null) {
      res = new ImageResource(path);
      this.imageResources.set(path, res);
    }
    return res;
  }

  public async loadAll(modBaseDir: string): Promise<void> {
    // TODO: handle errors!
    let resources: Array<Resource<unknown>> = [
      ...this.textResources.values(),
      ...this.imageResources.values(),
    ];
    let promises: Array<Promise<void>> = resources.map((r) => r.load(modBaseDir));
    await Promise.all(promises);
  }
}

export enum ResourceLoadState {
  Loading = 'Loading',
  Loaded = 'Loaded',
  Failed = 'Failed',
}

export abstract class Resource<D> {
  public loadState = ResourceLoadState.Loading;
  public loadPromise: Promise<void> | null = null;
  public data!: D;

  public constructor(public readonly path: string) {}

  public async load(modBaseDir: string): Promise<void> {
    if (this.loadPromise == null && this.loadState === ResourceLoadState.Loading) {
      this.loadPromise = (async () => {
        try {
          await this.loadInternal(modBaseDir);
          this.loadState = ResourceLoadState.Loaded;
        } catch (err) {
          this.loadState = ResourceLoadState.Failed;
          throw err;
        }
      })();
    }
    await this.loadPromise;
  }

  protected abstract loadInternal(modBaseDir: string): Promise<void>;
}

export class TextResource extends Resource<string> {
  protected async loadInternal(modBaseDir: string): Promise<void> {
    let res = await fetch(`/${modBaseDir}${this.path}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    this.data = await res.text();
  }
}

export class ImageResource extends Resource<HTMLImageElement> {
  protected async loadInternal(modBaseDir: string): Promise<void> {
    this.data = await new Promise((resolve, reject) => {
      let img = new Image();
      img.src = `/${modBaseDir}${this.path}`;
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
    });
  }
}
