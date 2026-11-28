import { Session } from "@inrupt/solid-client-authn-browser";
import { clientIdFor } from "./clientId";

export const session = new Session();

const OIDC_ISSUER = "https://solidcommunity.net";

const REDIRECT_URL = window.location.origin + "/redirect";

export async function initSession() {
  await session.handleIncomingRedirect({
    url: window.location.href,
    restorePreviousSession: false,
  });

  if (new URL(window.location.href).pathname === "/redirect") {
    window.history.replaceState({}, "", "/");
  }
}

export async function login() {
  const clientId = clientIdFor(window.location.origin);
  await session.login({
    oidcIssuer: OIDC_ISSUER,
    clientName: "Solid Emergency App",
    clientId,
    redirectUrl: REDIRECT_URL,
    // The library sends prompt=consent unless told otherwise, which makes the
    // identity provider show its approval page on every login even after
    // "Remember this client". With a fixed client ID, an empty prompt sends no
    // prompt parameter, so the approval page appears only the first time.
    // `prompt` is passed through by the library but is not in its public types.
    ...(clientId ? { prompt: "" } : {}),
  } as Parameters<typeof session.login>[0]);
}

export function logout() {
  return session.logout();
}

export function isLoggedIn() {
  return session.info.isLoggedIn === true;
}

export function getWebId() {
  return session.info.webId ?? null;
}

export const solidFetch = session.fetch.bind(session);
