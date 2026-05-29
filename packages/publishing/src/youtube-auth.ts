// One-time OAuth2 helpers to obtain a YouTube refresh token for unattended uploads.
// The refresh token is captured once (via the consent URL + code exchange) and stored
// in YOUTUBE_REFRESH_TOKEN; the uploader then refreshes access tokens automatically.

export const YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

export interface YoutubeAuthCreds {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export type HttpPostForm = (
  url: string,
  body: Record<string, string>,
) => Promise<unknown>;

const defaultPostForm: HttpPostForm = async (url, body) => {
  const f = (globalThis as { fetch: (input: string, init?: unknown) => Promise<any> }).fetch;
  const res = await f(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${await res.text()}`);
  return res.json();
};

// Build the Google consent URL. The user opens it, approves, and Google redirects to
// redirectUri with a `?code=` query param to feed into exchangeCodeForRefreshToken.
export function buildConsentUrl(creds: YoutubeAuthCreds, scope = YOUTUBE_UPLOAD_SCOPE): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("redirect_uri", creds.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", scope);
  return url.toString();
}

// Exchange an authorization code for a long-lived refresh token.
export async function exchangeCodeForRefreshToken(
  creds: YoutubeAuthCreds,
  code: string,
  postForm: HttpPostForm = defaultPostForm,
): Promise<string> {
  const res = (await postForm("https://oauth2.googleapis.com/token", {
    code,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: creds.redirectUri,
    grant_type: "authorization_code",
  })) as { refresh_token?: string };

  if (!res.refresh_token) {
    throw new Error(
      "no refresh_token in token response (ensure access_type=offline & prompt=consent, and that this is a first-time consent)",
    );
  }
  return res.refresh_token;
}
