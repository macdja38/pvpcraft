declare module "minecraft-jsonapi" {
  export type MinecraftJSSONApiOptions = {
    host: string;
    port: number;
    https: boolean;
    username: string;
    password: string;
  };

  export type MinecraftJSONApiResponse = {
    result: "success" | "error";
    is_success: boolean;
    source: string;
    tag?: string;
    success: (object | string)[] | object | number | boolean | string;
    error: {
      message: string;
      code: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
    }
  }[];

  function add(name: string, args: string[]): MinecraftJSONapi;

  function dispatch(options: MinecraftJSSONApiOptions): Promise<MinecraftJSONApiResponse>;

  function follow(options: MinecraftJSSONApiOptions, callback: (object: Record<string, unknown>) => void): WebSocket;

  export type MinecraftJSONApi = {
    add;
    follow;
    dispatch;
  };

  export function createRequest(): MinecraftJSONApi;
}
