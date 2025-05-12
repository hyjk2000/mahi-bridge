import Bun, { type BunRequest } from "bun";
import open from "open";
import * as client from "openid-client";

if (!process.env.PUBLIC_XERO_OAUTH_CLIENT_ID) {
  throw new Error(
    "Please set the PUBLIC_XERO_OAUTH_CLIENT_ID environment variable to your Xero app's client ID."
  );
}

const CONFIG = {
  discoveryUrl: "https://identity.xero.com/.well-known/openid-configuration",
  clientId: process.env.PUBLIC_XERO_OAUTH_CLIENT_ID,
  scope: "openid profile email accounting.contacts offline_access",
  redirectUrl: "http://localhost:8964/callback",
  redirectPort: 8964,
};

function discoverConfig() {
  return client.discovery(new URL(CONFIG.discoveryUrl), CONFIG.clientId);
}

async function authorize(): Promise<
  client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
> {
  const config = await discoverConfig();

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();

  const authorizationUrl = client.buildAuthorizationUrl(config, {
    response_type: "code",
    scope: CONFIG.scope,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    redirect_uri: CONFIG.redirectUrl,
  });

  console.log(`Opening authorization page: ${authorizationUrl}`);
  await open(authorizationUrl.toString());

  return new Promise((resolve, reject) => {
    const server = Bun.serve({
      port: CONFIG.redirectPort,
      routes: {
        "/callback": async (req: BunRequest) => {
          const url = new URL(req.url);
          const query = new URLSearchParams(url.search);

          if (query.get("state") !== state) {
            server.stop();
            reject(new Error("Invalid state"));
            return new Response("Invalid state", { status: 400 });
          }

          if (query.has("code")) {
            try {
              const tokens = await client.authorizationCodeGrant(config, url, {
                pkceCodeVerifier: codeVerifier,
                expectedState: state,
              });
              console.log("Successfully received tokens!");
              resolve(tokens);
              return new Response("Authorization successful", { status: 200 });
            } catch (error) {
              console.error("Error during token exchange:", error);
              reject(error);
              return new Response("Error during token exchange", {
                status: 500,
              });
            } finally {
              server.stop();
            }
          } else if (query.has("error")) {
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
    const session = await (sessionFile.json() as ReturnType<typeof authorize>);
    if (sessionFile.lastModified + session.expires_in! * 1000 < Date.now()) {
      const config = await discoverConfig();
      try {
        const tokens = await client.refreshTokenGrant(
          config,
          session.refresh_token!
        );
        sessionFile.write(JSON.stringify(tokens));
        return tokens;
      } catch (error) {
        console.warn("Error refreshing token:", error);
      }
    } else {
      return session;
    }
  }

  const tokens = await authorize();
  await Bun.write(sessionFile, JSON.stringify(tokens));
  return tokens;
}

export { authorize, persistedAuthorize };
