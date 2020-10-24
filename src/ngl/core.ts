export type GL = WebGL2RenderingContext;
export const GL = WebGL2RenderingContext;

export const SIZE_OF_BYTE = 1;
export const SIZE_OF_SHORT = 2;
export const SIZE_OF_INT = 4;
export const SIZE_OF_FLOAT = 4;

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
