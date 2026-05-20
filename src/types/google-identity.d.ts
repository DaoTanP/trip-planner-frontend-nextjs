export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: GoogleIdentityInitializeOptions): void;
          renderButton(
            parent: HTMLElement,
            options: GoogleIdentityButtonOptions
          ): void;
          cancel(): void;
        };
      };
    };
  }
}

interface GoogleIdentityInitializeOptions {
  client_id: string;
  callback(response: GoogleCredentialResponse): void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: "signin" | "signup" | "use";
  ux_mode?: "popup" | "redirect";
}

interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GoogleIdentityButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number | string;
  locale?: string;
}
