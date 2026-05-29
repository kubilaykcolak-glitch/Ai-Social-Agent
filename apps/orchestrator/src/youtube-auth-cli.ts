import { loadConfig, consoleLogger } from "@autosocial/core";
import { buildConsentUrl, exchangeCodeForRefreshToken } from "@autosocial/publishing";

function argValue(argv: string[], name: string): string | undefined {
  const flag = argv.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.slice(name.length + 3) : undefined;
}

// One-time helper to obtain a YouTube refresh token.
//   1) run with no --code -> prints the consent URL to open in a browser
//   2) approve, copy the `code` from the redirect URL
//   3) run again with --code=<code> -> prints YOUTUBE_REFRESH_TOKEN to paste into .env
async function main() {
  const cfg = loadConfig();
  const argv = process.argv.slice(2);
  const redirectUri = argValue(argv, "redirect") ?? "http://localhost";

  if (!cfg.youtubeClientId || !cfg.youtubeClientSecret) {
    consoleLogger.error("set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env first");
    process.exit(1);
  }
  const creds = {
    clientId: cfg.youtubeClientId,
    clientSecret: cfg.youtubeClientSecret,
    redirectUri,
  };

  const code = argValue(argv, "code");
  if (!code) {
    consoleLogger.info("1) Open this URL, approve access, then copy the `code` from the redirect:");
    consoleLogger.info(buildConsentUrl(creds));
    consoleLogger.info(`2) Re-run: autosocial-youtube-auth --code=<code> --redirect=${redirectUri}`);
    return;
  }

  const refreshToken = await exchangeCodeForRefreshToken(creds, code);
  consoleLogger.info("Success. Add this line to your .env:");
  consoleLogger.info(`YOUTUBE_REFRESH_TOKEN=${refreshToken}`);
}

main().catch((err) => {
  consoleLogger.error("youtube auth failed", err);
  process.exit(1);
});
