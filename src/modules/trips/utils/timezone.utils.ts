export function getDefaultItineraryItemTimezone(tripTimezone?: string | null) {
  return isValidTimezone(tripTimezone) ? tripTimezone : getLocalTimezone();
}

export function getLocalTimezone() {
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return isValidTimezone(localTimezone) ? localTimezone : "UTC";
}

function isValidTimezone(timezone: string | null | undefined): timezone is string {
  if (!timezone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
