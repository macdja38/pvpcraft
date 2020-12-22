import fsp from "fs/promises";
import { Canvas, Image } from "canvas";
import fetch from "node-fetch";

export function getImageFromFile(path: string) {
  return new Promise((resolve, reject) => {
    fsp.readFile(path).then((data) => {
      let img = new Image;
      img.src = data;
      resolve(img);
    });
  });
}

export function getImageFromUrl(url: string) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((response) => response.buffer())
      .then((image) => {
        let img = new Image;
        img.src = image;
        resolve(img);
      });
  });
}

export async function combineTwoImages(image1: unknown, image2: unknown): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    process.nextTick(() => {
      let canvas = new Canvas(128, 128), ctx = canvas.getContext("2d");
      ctx.drawImage(image1, 0, 0, 128, 128);
      ctx.rotate(30 / 180);
      ctx.drawImage(image2, -70, -55, 300, 130);
      // @ts-ignore
      let stream = canvas.pngStream();
      let buffers: Buffer[] = [];
      stream.on("data", (buffer: Buffer) => {
        buffers.push(buffer);
      });
      stream.on("end", () => {
        let buffer = Buffer.concat(buffers);
        resolve(buffer);
      });
    })
  })
}
