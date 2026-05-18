import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { loadMessages } from "./messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: process.env.NEXT_PUBLIC_DEFAULT_TIME_ZONE ?? "Asia/Bangkok",
    formats: {
      dateTime: {
        short: {
          day: "numeric",
          month: "short",
          year: "numeric"
        },
        tripDate: {
          weekday: "short",
          day: "numeric",
          month: "short"
        }
      },
      number: {
        distance: {
          maximumFractionDigits: 1
        }
      }
    }
  };
});
