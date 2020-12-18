import Eris from "eris";

export function toJSON(this: any) {
  let copy: Record<string, unknown> = {};
  keyLoop: for (let key in this) {
    if (this.hasOwnProperty(key) && !key.startsWith("_")) {
      for (let erisProp in Eris) {
        if (Eris.hasOwnProperty(erisProp)) {
          // @ts-ignore
          if (typeof Eris[erisProp] === "function" && this[key] instanceof Eris[erisProp]) {
            // @ts-ignore
            copy[key] = `[ Eris ${erisProp} ]`;
            continue keyLoop;
          }
        }
      }
      if (!this[key]) {
        copy[key] = this[key];
      } else if (this[key] instanceof Set) {
        copy[key] = "[ Set ]"
      } else if (this[key] instanceof Map) {
        copy[key] = "[ Map ]"
      } else {
        copy[key] = this[key];
      }
    }
  }
  return copy;
}
