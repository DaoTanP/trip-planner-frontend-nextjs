"use client";

import {
  BedDouble,
  Command,
  DollarSign,
  Map,
  MapPinPlus,
  NotebookPen,
  Plus,
  Route,
  Search,
  Sparkles,
  X
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCreateItineraryItemMutation } from "@/modules/itinerary/mutations/use-itinerary-mutations";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import { usePlannerStore, type PlannerQuickAddType } from "@/stores/use-planner-store";

import { sortTimelineItems } from "../../utils/planner-workspace.utils";
import { orderStride } from "../../utils/trip-editor.utils";

type PlannerFloatingActionsProps = {
  tripId: string;
  items: ItineraryItem[];
};

type QuickActionConfig = {
  id: PlannerQuickAddType;
  icon: typeof Sparkles;
  itemType?: ItineraryItem["type"] | undefined;
  titleKey: string;
};

const quickActions: QuickActionConfig[] = [
  { id: "place", icon: MapPinPlus, titleKey: "place" },
  { id: "activity", icon: Sparkles, itemType: "ACTIVITY", titleKey: "activity" },
  { id: "note", icon: NotebookPen, itemType: "NOTE", titleKey: "note" },
  { id: "transport", icon: Route, itemType: "TRANSPORT", titleKey: "transport" },
  { id: "lodging", icon: BedDouble, itemType: "LODGING", titleKey: "lodging" },
  { id: "expense", icon: DollarSign, itemType: "CUSTOM", titleKey: "expense" }
];

export function PlannerFloatingActions({ tripId, items }: PlannerFloatingActionsProps) {
  const t = useTranslations("trip.editor.quickAdd");
  const createItem = useCreateItineraryItemMutation(tripId);
  const isCommandPaletteOpen = usePlannerStore((state) => state.isCommandPaletteOpen);
  const setCommandPaletteOpen = usePlannerStore((state) => state.setCommandPaletteOpen);
  const setPlaceSearchOpen = usePlannerStore((state) => state.setPlaceSearchOpen);
  const setMobileMapOpen = usePlannerStore((state) => state.setMobileMapOpen);
  const setQuickAddType = usePlannerStore((state) => state.setQuickAddType);
  const orderedItems = useMemo(() => sortTimelineItems(items), [items]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (!isTyping && event.key === "/") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => window.removeEventListener("keydown", handleShortcut);
  }, [setCommandPaletteOpen]);

  function handleAction(action: QuickActionConfig) {
    setQuickAddType(action.id);

    if (action.id === "place") {
      setPlaceSearchOpen(true);
      setCommandPaletteOpen(false);
      return;
    }

    const lastSortOrder = orderedItems.at(-1)?.sortOrder ?? 0;
    createItem.mutate({
      title: t(`defaults.${action.titleKey}`),
      type: action.itemType ?? "CUSTOM",
      clientMutationId: crypto.randomUUID(),
      sortOrder: lastSortOrder + orderStride,
      metadata: {
        quickAddType: action.id
      }
    });
    setCommandPaletteOpen(false);
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="shadow-lg lg:hidden"
          aria-label={t("openMap")}
          onClick={() => setMobileMapOpen(true)}
        >
          <Map aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="shadow-lg"
          aria-label={t("openSearch")}
          onClick={() => setPlaceSearchOpen(true)}
        >
          <Search aria-hidden="true" />
        </Button>
        <Button
          type="button"
          className="h-11 shadow-lg"
          aria-label={t("openCommand")}
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Command aria-hidden="true" />
          {t("button")}
        </Button>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-background/50 backdrop-blur-sm transition-opacity",
          isCommandPaletteOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!isCommandPaletteOpen}
      >
        <div className="mx-auto mt-20 w-[calc(100%-2rem)] max-w-xl rounded-md border bg-card shadow-xl">
          <div className="flex h-14 items-center justify-between gap-3 border-b px-4">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <Command className="size-4" aria-hidden="true" />
              <span className="truncate">{t("paletteTitle")}</span>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t("close")}
              onClick={() => setCommandPaletteOpen(false)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>

          <div className="grid gap-1 p-2">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.id}
                  type="button"
                  className="flex h-11 items-center justify-between gap-3 rounded-md px-3 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
                  disabled={createItem.isPending}
                  onClick={() => handleAction(action)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{t(`actions.${action.titleKey}`)}</span>
                  </span>
                  <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          className="absolute inset-0 -z-10 cursor-default"
          aria-label={t("close")}
          onClick={() => setCommandPaletteOpen(false)}
        />
      </div>
    </>
  );
}
