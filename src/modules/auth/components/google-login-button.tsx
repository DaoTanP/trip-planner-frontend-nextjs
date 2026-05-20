"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/utils";

import { useOAuthLoginMutation } from "../mutations/use-oauth-login-mutation";

const googleIdentityScriptSrc = "https://accounts.google.com/gsi/client";

let googleIdentityScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services must run in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${googleIdentityScriptSrc}"]`
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Google script failed")), {
          once: true
        });
        return;
      }

      const script = document.createElement("script");
      script.src = googleIdentityScriptSrc;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Google script failed"));
      document.head.appendChild(script);
    });
  }

  return googleIdentityScriptPromise;
}

export function GoogleLoginButton() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const { isPending, mutate } = useOAuthLoginMutation("google");

  const handleCredential = useCallback(
    (response: { credential?: string }) => {
      if (!response.credential) {
        setScriptFailed(true);
        return;
      }

      mutate({ credential: response.credential });
    },
    [mutate]
  );

  useEffect(() => {
    if (!appConfig.googleOAuthClientId) {
      return;
    }

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: appConfig.googleOAuthClientId,
          callback: handleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          ux_mode: "popup"
        });

        setScriptReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setScriptFailed(true);
        }
      });

    return () => {
      cancelled = true;
      window.google?.accounts?.id.cancel();
    };
  }, [handleCredential]);

  useEffect(() => {
    if (!scriptReady || !buttonRef.current || !window.google?.accounts?.id) {
      return;
    }

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: buttonRef.current.offsetWidth,
      locale
    });
  }, [locale, scriptReady]);

  if (!appConfig.googleOAuthClientId || scriptFailed) {
    return (
      <Button type="button" variant="outline" className="w-full" disabled>
        {t(!appConfig.googleOAuthClientId ? "login.googleNotConfigured" : "login.googleUnavailable")}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "grid min-h-11 w-full place-items-center",
        isPending && "pointer-events-none opacity-60"
      )}
      aria-busy={isPending}
      aria-label={t("login.google")}
    >
      {!scriptReady ? (
        <Button type="button" variant="outline" className="w-full" disabled>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {t("login.googleLoading")}
        </Button>
      ) : null}
      <div ref={buttonRef} className={cn("w-full", !scriptReady && "hidden")} />
    </div>
  );
}
