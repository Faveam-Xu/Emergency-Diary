// Solid-OIDC Client ID document (public/clientid.jsonld). Logging in with a
// fixed client ID lets the identity provider remember the user's approval
// ("Remember this client"), so the approval page is not shown on every login.
// With no client ID the app is registered again on each login, under a new
// ID, and the approval page always appears.
export const CLIENT_ID =
  "https://emergency-diary-dsip-leiden.netlify.app/clientid.jsonld";

// Origins whose /redirect URL is listed in the document's redirect_uris.
// Any other origin (e.g. a different dev port) falls back to registering
// the app on each login.
export const CLIENT_ID_ORIGINS = [
  "https://emergency-diary-dsip-leiden.netlify.app",
  "http://localhost:5173",
];

export function clientIdFor(origin: string): string | undefined {
  return CLIENT_ID_ORIGINS.includes(origin) ? CLIENT_ID : undefined;
}
