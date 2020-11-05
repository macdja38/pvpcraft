declare module "mcping-js" {
  export type MinecraftPingResponse = {
    version: {
      name: string,
      protocol: number
    },
    players: {
      max: number,
      online: number,
      sample: {
        name: string,
        id: string
      }[]
    },
    description: {
      text: string,
      extra: {
        text: string,
        color: string,
        bold: boolean,
      }[]
    },
    favicon: string,
  };

  export class MinecraftServer {
    constructor(server: string, port: number = 25565)

    ping(timeout: number, protocolVersion: number, callback: (error: Error, response: MinecraftPingResponse) => void)
  }

  export default {
    MinecraftServer
  }
}
