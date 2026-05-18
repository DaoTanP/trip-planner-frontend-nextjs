import type { Locale } from "./routing";

export const messageNamespaces = [
  "common",
  "auth",
  "trip",
  "itinerary",
  "places",
  "profile",
  "validation"
] as const;

export type MessageNamespace = (typeof messageNamespaces)[number];

export async function loadMessages(locale: Locale) {
  const messages = await Promise.all(
    messageNamespaces.map(async (namespace) => {
      const messagesModule = await import(`./messages/${locale}/${namespace}.json`);

      return [namespace, messagesModule.default] as const;
    })
  );

  return Object.fromEntries(messages);
}
