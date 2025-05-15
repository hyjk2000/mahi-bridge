import { decodeJwt } from "jose";
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  discovery,
  randomPKCECodeVerifier,
  randomState,
  refreshTokenGrant,
} from "openid-client";
import { once } from "remeda";
import { type Browser, browser } from "wxt/browser";

if (!import.meta.env.VITE_XERO_OAUTH_CLIENT_ID) {
  throw new Error("Please set the PUBLIC_XERO_OAUTH_CLIENT_ID environment variable.");
}

const CONFIG = {
  discoveryUrl: "https://identity.xero.com/.well-known/openid-configuration",
  clientId: import.meta.env.VITE_XERO_OAUTH_CLIENT_ID,
  scope: "openid profile email accounting.contacts offline_access",
  redirectUrl: browser.identity.getRedirectURL("callback"),
};

const discoverConfig = once(() => discovery(new URL(CONFIG.discoveryUrl), CONFIG.clientId));

const launchWebAuthFlow = (details: Browser.identity.WebAuthFlowDetails): Promise<string> =>
  new Promise((resolve, reject) => {
    browser.identity.launchWebAuthFlow(details, (redirectUrl) => {
      if (browser.runtime.lastError) {
        reject(new Error(browser.runtime.lastError.message));
        return;
      }
      if (!redirectUrl) {
        reject(new Error("No redirect URL received"));
        return;
      }
      resolve(redirectUrl);
    });
  });

const isTokenExpired = (token: string) => {
  const decoded = decodeJwt(token);
  const exp = decoded.exp;
  const now = Math.floor(Date.now() / 1000);
  return exp ? now > exp : false;
};

async function authorize() {
  const config = await discoverConfig();

  const codeVerifier = randomPKCECodeVerifier();
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
  const state = randomState();

  const authorizationUrl = buildAuthorizationUrl(config, {
    response_type: "code",
    scope: CONFIG.scope,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    redirect_uri: CONFIG.redirectUrl,
  });

  const redirectUrl = await launchWebAuthFlow({
    url: authorizationUrl.toString(),
    interactive: true,
  });

  const url = new URL(redirectUrl);
  const query = new URLSearchParams(url.search);

  if (query.get("state") !== state) {
    throw new Error("Invalid state");
  }

  if (query.has("code")) {
    return authorizationCodeGrant(config, url, {
      pkceCodeVerifier: codeVerifier,
      expectedState: state,
    });
  }

  if (query.has("error")) {
    const error = query.get("error");
    throw new Error(`Authorization error: ${error}`);
  }

  throw new Error("No code or error in the redirect URL");
}

type Tokens = Awaited<ReturnType<typeof authorize>>;

async function getTokens() {
  const { tokens } = await browser.storage.local.get<{ tokens: Tokens }>("tokens");

  if (tokens?.access_token && !isTokenExpired(tokens.access_token)) return tokens;

  if (tokens?.refresh_token) {
    const config = await discoverConfig();
    const newTokens = await refreshTokenGrant(config, tokens.refresh_token);
    await browser.storage.local.set({ tokens: newTokens });
    return newTokens;
  }
}

async function persistedAuthorize() {
  const newTokens = await authorize();
  await browser.storage.local.set({ tokens: newTokens });
  return newTokens;
}

const clearTokens = () => browser.storage.local.remove("tokens");

export { authorize, clearTokens, getTokens, persistedAuthorize };
