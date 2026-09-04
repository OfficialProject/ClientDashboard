/**
 * Run once per bot account, interactively, from a terminal:
 *   npx tsx scripts/setup-bot-2fa.ts
 *
 * This automates ONLY the Steam Guard Mobile Authenticator enrollment step
 * (add authenticator -> confirm via SMS code -> finalize), using the same
 * API calls the official Steam Mobile app makes. It does NOT and CANNOT
 * automate creating the Steam account itself or its phone verification -
 * those are the actual anti-bot barrier and this script doesn't try to
 * get around them. You need an existing, phone-verified account before
 * running this.
 *
 * IMPORTANT: enrolling a NEW mobile authenticator on an account that
 * already has one (e.g. your own personal account) will kick out the
 * existing one. Only run this against the dedicated bot account.
 */
import * as readline from "readline";
import { LoginSession, EAuthTokenPlatformType, EAuthSessionGuardType } from "steam-session";
import SteamCommunity from "steamcommunity";
import SteamID from "steamid";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const accountName = await ask("Bot account Steam username: ");
  const password = await ask("Bot account Steam password: ");

  const session = new LoginSession(EAuthTokenPlatformType.MobileApp);
  const startResult = await session.startWithCredentials({ accountName, password });

  if (startResult.actionRequired) {
    const guard = startResult.validActions?.find((a) => a.type !== undefined);
    if (guard?.type === EAuthSessionGuardType.EmailCode || guard?.type === EAuthSessionGuardType.DeviceCode) {
      const code = await ask(
        `Enter the Steam Guard code sent to ${guard.detail ?? "your device/email"}: `
      );
      await session.submitSteamGuardCode(code.trim());
    } else {
      console.error(
        "This account needs a login confirmation type this script doesn't handle automatically " +
          "(e.g. approve-in-app). Approve it on the account's existing device, then re-run."
      );
      process.exit(1);
    }
  }

  await new Promise<void>((resolve, reject) => {
    session.on("authenticated", () => resolve());
    session.on("error", (err) => reject(err));
  });

  console.log("Logged in. Enrolling Steam Guard Mobile Authenticator...");

  const community = new SteamCommunity();
  community.steamID = new SteamID(session.steamID!.getSteamID64());
  (community as unknown as { setMobileAppAccessToken: (token: string) => void }).setMobileAppAccessToken(session.accessToken!);

  const enrollment: { shared_secret: string; revocation_code: string } = await new Promise((resolve, reject) => {
    community.enableTwoFactor((err: Error | null, response: any) => (err ? reject(err) : resolve(response)));
  });

  const smsCode = await ask("Enter the SMS activation code Steam just texted the bot account's phone number: ");

  await new Promise<void>((resolve, reject) => {
    community.finalizeTwoFactor(enrollment.shared_secret, smsCode.trim(), (err: Error | null) =>
      err ? reject(err) : resolve()
    );
  });

  console.log("\nDone. Add these to your .env (don't commit them):\n");
  console.log(`STEAM_BOT_USERNAME=${accountName}`);
  console.log(`STEAM_BOT_PASSWORD=${password}`);
  console.log(`STEAM_BOT_SHARED_SECRET=${enrollment.shared_secret}`);
  console.log(
    `\nRevocation code (save this somewhere safe - it's the only way to remove the authenticator later if needed): ${enrollment.revocation_code}`
  );

  rl.close();
}

main().catch((err) => {
  console.error("Setup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
