import Bun, { type BunRequest } from "bun";
import { decodeJwt } from "jose";
import open from "open";
import {
  type TokenEndpointResponse,
  type TokenEndpointResponseHelpers,
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  discovery,
  randomPKCECodeVerifier,
  randomState,
  refreshTokenGrant,
} from "openid-client";
import { once } from "remeda";

if (!process.env.PUBLIC_XERO_OAUTH_CLIENT_ID) {
  throw new Error("Please set the PUBLIC_XERO_OAUTH_CLIENT_ID environment variable to your Xero app's client ID.");
}

const redirectPort = 8964;

const CONFIG = {
  discoveryUrl: "https://identity.xero.com/.well-known/openid-configuration",
  clientId: process.env.PUBLIC_XERO_OAUTH_CLIENT_ID,
  scope: "openid profile email accounting.contacts offline_access",
  redirectUrl: `http://localhost:${redirectPort}/callback`,
};

const discoverConfig = once(() => discovery(new URL(CONFIG.discoveryUrl), CONFIG.clientId));

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

  console.log(`Opening authorization page: ${authorizationUrl}`);
  void open(authorizationUrl.toString());

  return new Promise<TokenEndpointResponse & TokenEndpointResponseHelpers>((resolve, reject) => {
    const server = Bun.serve({
      port: redirectPort,
      routes: {
        "/callback": (req: BunRequest) => {
          const url = new URL(req.url);
          const query = new URLSearchParams(url.search);

          if (query.get("state") !== state) {
            server.stop();
            reject(new Error("Invalid state"));
            return new Response("Invalid state", { status: 400 });
          }

          if (query.has("code")) {
            return authorizationCodeGrant(config, url, {
              pkceCodeVerifier: codeVerifier,
              expectedState: state,
            })
              .then((tokens) => {
                console.log("Successfully received tokens!");
                resolve(tokens);
                return new Response("Authorization successful", {
                  status: 200,
                });
              })
              .catch((error) => {
                console.error("Error during token exchange:", error);
                reject(error);
                return new Response("Error during token exchange", {
                  status: 500,
                });
              })
              .finally(() => {
                server.stop();
              });
          }

          if (query.has("error")) {
            const error = query.get("error");
            server.stop();
            reject(new Error(`Authorization error: ${error}`));
            return new Response(`Authorization error: ${error}`, {
              status: 400,
            });
          }

          return new Response("Bad Request", {
            status: 400,
          });
        },
      },
    });
  });
}

async function persistedAuthorize() {
  const sessionFile = Bun.file("./session.json");

  if (await sessionFile.exists()) {
    const tokens = await (sessionFile.json() as ReturnType<typeof authorize>);

    if (tokens?.access_token && !isTokenExpired(tokens.access_token)) {
      return tokens;
    }

    if (tokens?.refresh_token) {
      try {
        const config = await discoverConfig();
        const newTokens = await refreshTokenGrant(config, tokens.refresh_token);
        sessionFile.write(JSON.stringify(newTokens));
        return newTokens;
      } catch (error) {
        console.warn("Error refreshing token:", error);
      }
    }
  }

  const newTokens = await authorize();
  await Bun.write(sessionFile, JSON.stringify(newTokens));
  return newTokens;
}

export { authorize, persistedAuthorize };
