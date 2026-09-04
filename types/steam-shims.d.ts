declare module "steam-totp" {
  function generateAuthCode(sharedSecret: string, timeOffset?: number): string;
  function getTimeOffset(callback: (err: Error | null, offset: number, latency: number) => void): void;
  export = { generateAuthCode, getTimeOffset };
}

declare module "globaloffensive-sharecode" {
  export class ShareCode {
    constructor(code: string);
    decode(): { matchId: string; outcomeId: string; token: string };
  }
}

declare module "seek-bzip" {
  function decode(input: Uint8Array | Buffer, outputSize?: number): Buffer;
  const _default: { decode: typeof decode };
  export default _default;
}
