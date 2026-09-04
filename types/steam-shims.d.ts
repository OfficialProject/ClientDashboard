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
