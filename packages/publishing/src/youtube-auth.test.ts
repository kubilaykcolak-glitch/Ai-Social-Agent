import { describe, it, expect } from "vitest";
import { buildConsentUrl, exchangeCodeForRefreshToken, YOUTUBE_UPLOAD_SCOPE } from "./youtube-auth.js";

const creds = {
  clientId: "cid.apps.googleusercontent.com",
  clientSecret: "secret",
  redirectUri: "http://localhost",
};

describe("buildConsentUrl", () => {
  it("builds a Google consent URL requesting offline upload access", () => {
    const url = new URL(buildConsentUrl(creds));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe(creds.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(creds.redirectUri);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toBe(YOUTUBE_UPLOAD_SCOPE);
  });
});

describe("exchangeCodeForRefreshToken", () => {
  it("posts the code and returns the refresh token", async () => {
    let seenUrl = "";
    let seenBody: Record<string, string> = {};
    const refresh = await exchangeCodeForRefreshToken(creds, "auth-code-123", async (url, body) => {
      seenUrl = url;
      seenBody = body;
      return { refresh_token: "1//refresh-xyz", access_token: "ya29.x" };
    });

    expect(refresh).toBe("1//refresh-xyz");
    expect(seenUrl).toBe("https://oauth2.googleapis.com/token");
    expect(seenBody).toMatchObject({
      code: "auth-code-123",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: creds.redirectUri,
    });
  });

  it("throws when the response has no refresh_token", async () => {
    await expect(
      exchangeCodeForRefreshToken(creds, "code", async () => ({ access_token: "ya29.x" })),
    ).rejects.toThrow(/refresh_token/);
  });
});
