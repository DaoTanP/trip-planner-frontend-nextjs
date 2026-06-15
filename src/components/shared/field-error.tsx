import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { semanticColorClassNames } from "@/theme";

interface FieldErrorProps {
  id?: string | undefined;
  message?: string | undefined;
  className?: string | undefined;
}

export function FieldError({ id, message, className }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      className={cn(
        "flex items-center gap-1.5 text-sm",
        semanticColorClassNames.errorText,
        className
      )}
    >
      <AlertCircle className="size-3.5" aria-hidden="true" />
      {message}
    </p>
  );
}
