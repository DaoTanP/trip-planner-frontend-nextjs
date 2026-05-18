"use client";

import { useCallback, useState } from "react";

export function useDisclosure(defaultOpen = false) {
  const [open, setOpen] = useState(defaultOpen);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const onToggle = useCallback(() => setOpen((value) => !value), []);

  return {
    open,
    setOpen,
    onOpen,
    onClose,
    onToggle
  };
}
