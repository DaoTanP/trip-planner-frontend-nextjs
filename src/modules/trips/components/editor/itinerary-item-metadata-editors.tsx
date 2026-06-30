"use client";

import { CalendarCheck, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { semanticColorClassNames, uiStateColorClassNames } from "@/theme";

interface ScheduleMetadataEditorProps {
  startsAt: string | null;
  timezone?: string | null | undefined;
  defaultTimezone?: string | null | undefined;
  disabled?: boolean | undefined;
  onCommit: (payload: { startsAt: string | null; timezone: string }) => Promise<void>;
}

interface DurationMetadataEditorProps {
  durationMinutes: number | null;
  disabled?: boolean | undefined;
  onCommit: (durationMinutes: number | null) => Promise<void>;
}

interface DateTimeDraft {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

interface VisibleMonth {
  year: number;
  month: number;
}

interface MetadataPopoverPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  side: "top" | "bottom";
}

interface TimeZoneOption {
  value: string;
  offsetMinutes: number;
  offsetLabel: string;
  searchText: string;
}

const maxDurationHours = 240;
const popoverViewportPadding = 8;
const popoverGap = 8;
const metadataPopoverMinimumHeight = 96;
const fallbackTimeZones = [
  "UTC",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney"
];

export function ScheduleMetadataEditor({
  startsAt,
  timezone,
  defaultTimezone,
  disabled = false,
  onCommit
}: ScheduleMetadataEditorProps) {
  const t = useTranslations("trip.editor.item");
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);
  const timeZone = useMemo(
    () => getEditorTimeZone(timezone, defaultTimezone),
    [defaultTimezone, timezone]
  );
  const [draftTimeZone, setDraftTimeZone] = useState(timeZone);
  const [timeZoneSearch, setTimeZoneSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<DateTimeDraft>(() => getDraftFromStartsAt(startsAt, timeZone));
  const [visibleMonth, setVisibleMonth] = useState<VisibleMonth>(() => ({
    year: draft.year,
    month: draft.month
  }));
  const draftStartsAt = draftToStartsAt(draft, draftTimeZone);
  const displayStartsAt = isOpen ? draftStartsAt : startsAt;
  const displayTimeZone = isOpen ? draftTimeZone : timeZone;
  const displayLabel = formatScheduleValue(displayStartsAt, displayTimeZone, t);
  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth.year, visibleMonth.month),
    [visibleMonth]
  );
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);
  const monthLabel = useMemo(
    () => formatMonthLabel(visibleMonth.year, visibleMonth.month, locale),
    [locale, visibleMonth]
  );
  const today = useMemo(() => getZonedDateTimeParts(new Date(), draftTimeZone), [draftTimeZone]);
  const timeZoneOptions = useMemo(
    () => getTimeZoneOptions(draftStartsAt, draftTimeZone, timezone, defaultTimezone),
    [defaultTimezone, draftStartsAt, draftTimeZone, timezone]
  );
  const filteredTimeZoneOptions = useMemo(
    () => filterTimeZoneOptions(timeZoneOptions, timeZoneSearch),
    [timeZoneOptions, timeZoneSearch]
  );

  useDismissableMetadataPopover({
    containerRef,
    popoverRef,
    isOpen,
    onDismiss: () => {
      void commitAndClose();
    },
    onEscape: cancelEditing
  });

  function openEditor() {
    const nextDraft = getDraftFromStartsAt(startsAt, timeZone);

    setDraftTimeZone(timeZone);
    setTimeZoneSearch("");
    setDraft(nextDraft);
    setVisibleMonth({ year: nextDraft.year, month: nextDraft.month });
    setErrorMessage(null);
    setIsOpen(true);
  }

  function cancelEditing() {
    setErrorMessage(null);
    setIsOpen(false);
  }

  async function commitAndClose() {
    if (isSavingRef.current) {
      return;
    }

    const nextStartsAt = normalizeIsoToMinute(draftStartsAt);
    const currentStartsAt = normalizeIsoToMinute(startsAt);
    const currentTimeZone = timeZone;

    if (nextStartsAt === currentStartsAt && draftTimeZone === currentTimeZone) {
      setIsOpen(false);
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onCommit({ startsAt: nextStartsAt, timezone: draftTimeZone });
      setIsOpen(false);
    } catch {
      const revertedDraft = getDraftFromStartsAt(startsAt, timeZone);

      setDraftTimeZone(timeZone);
      setDraft(revertedDraft);
      setVisibleMonth({ year: revertedDraft.year, month: revertedDraft.month });
      setErrorMessage(t("scheduleUpdateError"));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  async function clearSchedule() {
    if (isSavingRef.current) {
      return;
    }

    if (startsAt === null && draftTimeZone === timeZone) {
      setIsOpen(false);
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onCommit({ startsAt: null, timezone: draftTimeZone });
      setIsOpen(false);
    } catch {
      const revertedDraft = getDraftFromStartsAt(startsAt, timeZone);

      setDraftTimeZone(timeZone);
      setDraft(revertedDraft);
      setVisibleMonth({ year: revertedDraft.year, month: revertedDraft.month });
      setErrorMessage(t("scheduleUpdateError"));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  function handleTriggerClick() {
    if (disabled || isSaving) {
      return;
    }

    if (isOpen) {
      void commitAndClose();
      return;
    }

    openEditor();
  }

  function handleDateSelected(day: number) {
    setErrorMessage(null);
    setDraft((current) => ({
      ...current,
      year: visibleMonth.year,
      month: visibleMonth.month,
      day
    }));
  }

  function moveMonth(offset: number) {
    setVisibleMonth((current) => {
      const nextDate = new Date(Date.UTC(current.year, current.month + offset, 1));

      return {
        year: nextDate.getUTCFullYear(),
        month: nextDate.getUTCMonth()
      };
    });
  }

  return (
    <span ref={containerRef} className="relative inline-flex min-w-0">
      <button
        type="button"
        className={cn(
          metadataTriggerClassName,
          isOpen && "bg-muted text-foreground",
          (disabled || isSaving) && "cursor-not-allowed opacity-60"
        )}
        aria-label={t("editStart", { value: displayLabel })}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled || isSaving}
        onClick={(event) => {
          event.stopPropagation();
          handleTriggerClick();
        }}
      >
        <CalendarCheck className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{displayLabel}</span>
      </button>

      {isOpen ? (
        <MetadataPopover anchorRef={containerRef} popoverRef={popoverRef} className="w-80">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{t("dateTimePickerTitle")}</p>
            <span className="text-xs text-muted-foreground">
              {t("timezoneHint", { value: formatTimeZoneOffset(draftStartsAt, draftTimeZone) })}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t("previousMonth")}
              disabled={isSaving}
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <p className="text-sm font-medium text-foreground">{monthLabel}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t("nextMonth")}
              disabled={isSaving}
              onClick={() => moveMonth(1)}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center">
            {weekdayLabels.map((label) => (
              <span key={label} className="py-1 text-[0.6875rem] text-muted-foreground">
                {label}
              </span>
            ))}
            {calendarDays.map((day, index) =>
              day === null ? (
                <span key={`empty-${index}`} aria-hidden="true" />
              ) : (
                <button
                  key={day}
                  type="button"
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-md text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2",
                    draft.year === visibleMonth.year &&
                      draft.month === visibleMonth.month &&
                      draft.day === day &&
                      uiStateColorClassNames.selectedControl,
                    today.year === visibleMonth.year &&
                      today.month === visibleMonth.month &&
                      today.day === day &&
                      "font-semibold"
                  )}
                  aria-label={formatDateLabel(visibleMonth.year, visibleMonth.month, day, locale)}
                  aria-pressed={
                    draft.year === visibleMonth.year &&
                    draft.month === visibleMonth.month &&
                    draft.day === day
                  }
                  disabled={isSaving}
                  onClick={() => handleDateSelected(day)}
                >
                  {day}
                </button>
              )
            )}
          </div>

          <div className="mt-3 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">{t("timeLabel")}</p>
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <NumberSegmentInput
                value={draft.hour}
                min={0}
                max={23}
                label={t("hourLabel")}
                disabled={isSaving}
                onChange={(hour) => {
                  setErrorMessage(null);
                  setDraft((current) => ({
                    ...current,
                    hour
                  }));
                }}
              />
              <span className="text-sm text-muted-foreground">:</span>
              <NumberSegmentInput
                value={draft.minute}
                min={0}
                max={59}
                label={t("minuteLabel")}
                disabled={isSaving}
                onChange={(minute) => {
                  setErrorMessage(null);
                  setDraft((current) => ({
                    ...current,
                    minute
                  }));
                }}
              />
            </div>
            <TimeZonePicker
              label={t("timezoneLabel")}
              searchPlaceholder={t("timezoneSearchPlaceholder")}
              emptyLabel={t("timezoneNoResults")}
              value={draftTimeZone}
              options={filteredTimeZoneOptions}
              searchValue={timeZoneSearch}
              disabled={isSaving}
              onSearchChange={setTimeZoneSearch}
              onChange={(nextTimeZone) => {
                setErrorMessage(null);
                setDraftTimeZone(nextTimeZone);
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={isSaving}
              onClick={() => void clearSchedule()}
            >
              {t("clearSchedule")}
            </Button>
            {isSaving ? (
              <span className="text-xs text-muted-foreground">{t("updateSaving")}</span>
            ) : null}
          </div>

          {errorMessage ? (
            <p className={cn("mt-2 text-xs", semanticColorClassNames.errorText)} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </MetadataPopover>
      ) : null}
    </span>
  );
}

export function DurationMetadataEditor({
  durationMinutes,
  disabled = false,
  onCommit
}: DurationMetadataEditorProps) {
  const t = useTranslations("trip.editor.item");
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftMinutes, setDraftMinutes] = useState<number | null>(durationMinutes);
  const displayMinutes = isOpen ? draftMinutes : durationMinutes;
  const displayLabel =
    typeof displayMinutes === "number"
      ? formatDurationMinutes(displayMinutes, t)
      : t("durationFlexible");
  const durationHours =
    typeof draftMinutes === "number" ? Math.floor(Math.max(0, draftMinutes) / 60) : 0;
  const durationRemainderMinutes =
    typeof draftMinutes === "number" ? Math.max(0, draftMinutes) % 60 : 0;

  useDismissableMetadataPopover({
    containerRef,
    popoverRef,
    isOpen,
    onDismiss: () => {
      void commitAndClose();
    },
    onEscape: cancelEditing
  });

  function openEditor() {
    setDraftMinutes(durationMinutes);
    setErrorMessage(null);
    setIsOpen(true);
  }

  function cancelEditing() {
    setErrorMessage(null);
    setIsOpen(false);
  }

  async function commitAndClose() {
    if (isSavingRef.current) {
      return;
    }

    const currentDuration = durationMinutes ?? null;
    const nextDuration = draftMinutes ?? null;

    if (nextDuration === currentDuration) {
      setIsOpen(false);
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onCommit(nextDuration);
      setIsOpen(false);
    } catch {
      setDraftMinutes(durationMinutes);
      setErrorMessage(t("durationUpdateError"));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  function handleTriggerClick() {
    if (disabled || isSaving) {
      return;
    }

    if (isOpen) {
      void commitAndClose();
      return;
    }

    openEditor();
  }

  function updateDuration(hours: number, minutes: number) {
    const nextHours = clampInteger(hours, 0, maxDurationHours);
    const nextMinutes = clampInteger(minutes, 0, 59);

    setErrorMessage(null);
    setDraftMinutes(nextHours * 60 + nextMinutes);
  }

  return (
    <span ref={containerRef} className="relative inline-flex min-w-0">
      <button
        type="button"
        className={cn(
          metadataTriggerClassName,
          isOpen && "bg-muted text-foreground",
          (disabled || isSaving) && "cursor-not-allowed opacity-60"
        )}
        aria-label={t("editDuration", { value: displayLabel })}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled || isSaving}
        onClick={(event) => {
          event.stopPropagation();
          handleTriggerClick();
        }}
      >
        <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{displayLabel}</span>
      </button>

      {isOpen ? (
        <MetadataPopover
          anchorRef={containerRef}
          popoverRef={popoverRef}
          align="end"
          className="w-64"
        >
          <p className="text-sm font-medium text-foreground">{t("durationPickerTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("durationPreview", { value: displayLabel })}
          </p>

          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              {t("hourLabel")}
              <NumberSegmentInput
                value={durationHours}
                min={0}
                max={maxDurationHours}
                label={t("hourLabel")}
                disabled={isSaving}
                onChange={(hours) => updateDuration(hours, durationRemainderMinutes)}
              />
            </label>
            <span className="pb-2 text-sm text-muted-foreground">:</span>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              {t("minuteLabel")}
              <NumberSegmentInput
                value={durationRemainderMinutes}
                min={0}
                max={59}
                label={t("minuteLabel")}
                disabled={isSaving}
                onChange={(minutes) => updateDuration(durationHours, minutes)}
              />
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={isSaving}
              onClick={() => {
                setErrorMessage(null);
                setDraftMinutes(null);
              }}
            >
              {t("clearDuration")}
            </Button>
            {isSaving ? (
              <span className="text-xs text-muted-foreground">{t("updateSaving")}</span>
            ) : null}
          </div>

          {errorMessage ? (
            <p className={cn("mt-2 text-xs", semanticColorClassNames.errorText)} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </MetadataPopover>
      ) : null}
    </span>
  );
}

function NumberSegmentInput({
  value,
  min,
  max,
  label,
  disabled = false,
  onChange
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  disabled?: boolean | undefined;
  onChange: (value: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(nextTextValue: string) {
    const nextValue =
      nextTextValue.trim().length === 0 ? min : clampInteger(Number(nextTextValue), min, max);

    if (inputRef.current) {
      inputRef.current.value = formatTwoDigit(nextValue);
    }
    onChange(nextValue);
  }

  function step(offset: number) {
    const currentTextValue = inputRef.current?.value ?? String(value);
    const currentValue =
      currentTextValue.trim().length === 0
        ? value
        : clampInteger(Number(currentTextValue), min, max);
    const nextValue = wrapNumber(currentValue + offset, min, max);

    if (inputRef.current) {
      inputRef.current.value = formatTwoDigit(nextValue);
    }
    onChange(nextValue);
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      defaultValue={formatTwoDigit(value)}
      aria-label={label}
      disabled={disabled}
      className="h-10 w-full rounded-md border bg-background px-2 text-center text-base font-medium tabular-nums text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      onChange={(event) => {
        const nextTextValue = event.target.value.replace(/\D/g, "").slice(0, 3);

        event.currentTarget.value = nextTextValue;

        if (nextTextValue.length > 0) {
          onChange(clampInteger(Number(nextTextValue), min, max));
        }
      }}
      onBlur={(event) => commit(event.currentTarget.value)}
      onFocus={(event) => event.currentTarget.select()}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          step(1);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          step(-1);
        } else if (event.key === "PageUp") {
          event.preventDefault();
          step(10);
        } else if (event.key === "PageDown") {
          event.preventDefault();
          step(-10);
        } else if (event.key === "Home") {
          event.preventDefault();
          if (inputRef.current) {
            inputRef.current.value = formatTwoDigit(min);
          }
          onChange(min);
        } else if (event.key === "End") {
          event.preventDefault();
          if (inputRef.current) {
            inputRef.current.value = formatTwoDigit(max);
          }
          onChange(max);
        } else if (event.key === "Enter") {
          event.preventDefault();
          commit(event.currentTarget.value);
        }
      }}
      onWheel={(event) => {
        if (document.activeElement !== event.currentTarget) {
          return;
        }

        event.preventDefault();
        step(event.deltaY < 0 ? 1 : -1);
      }}
    />
  );
}

function TimeZonePicker({
  label,
  searchPlaceholder,
  emptyLabel,
  value,
  options,
  searchValue,
  disabled = false,
  onSearchChange,
  onChange
}: {
  label: string;
  searchPlaceholder: string;
  emptyLabel: string;
  value: string;
  options: TimeZoneOption[];
  searchValue: string;
  disabled?: boolean | undefined;
  onSearchChange: (value: string) => void;
  onChange: (value: string) => void;
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusOption(index: number) {
    optionRefs.current[index]?.focus();
  }

  function handleOptionKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index === 0) {
        event.currentTarget
          .closest("[data-timezone-picker]")
          ?.querySelector<HTMLInputElement>("input")
          ?.focus();
      } else {
        focusOption(index - 1);
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusOption(options.length - 1);
    }
  }

  return (
    <div className="mt-3 grid gap-1.5" data-timezone-picker>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        type="search"
        value={searchValue}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        disabled={disabled}
        className="h-9"
        onChange={(event) => onSearchChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && options.length > 0) {
            event.preventDefault();
            focusOption(0);
          }
        }}
      />
      <div
        role="listbox"
        aria-label={label}
        className="max-h-44 overflow-y-auto rounded-md border bg-background p-1"
      >
        {options.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          options.map((option, index) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "grid w-full grid-cols-[5.75rem_1fr] items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-2",
                  isSelected && uiStateColorClassNames.selectedControl
                )}
                disabled={disabled}
                onClick={() => onChange(option.value)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
              >
                <span
                  className={cn(
                    "font-medium tabular-nums text-muted-foreground",
                    isSelected && uiStateColorClassNames.selectedControlText
                  )}
                >
                  ({option.offsetLabel})
                </span>
                <span className="min-w-0 truncate">{option.value}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function MetadataPopover({
  children,
  anchorRef,
  popoverRef,
  align = "start",
  className
}: {
  children: React.ReactNode;
  anchorRef: RefObject<HTMLElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  align?: "start" | "end" | undefined;
  className?: string | undefined;
}) {
  const position = useAnchoredPopoverPosition({
    anchorRef,
    popoverRef,
    align
  });

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      className={cn(
        "fixed z-[100] overflow-y-auto rounded-md border bg-popover p-3 text-popover-foreground shadow-sm",
        "data-[side=bottom]:animate-in data-[side=bottom]:slide-in-from-top-1 data-[side=top]:animate-in data-[side=top]:slide-in-from-bottom-1",
        position === null && "pointer-events-none opacity-0",
        className
      )}
      data-side={position?.side ?? "bottom"}
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        width: position?.width,
        maxHeight: position?.maxHeight
      }}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

const metadataTriggerClassName =
  "-mx-1 inline-flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2";

function useAnchoredPopoverPosition({
  anchorRef,
  popoverRef,
  align
}: {
  anchorRef: RefObject<HTMLElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  align: "start" | "end";
}) {
  const [position, setPosition] = useState<MetadataPopoverPosition | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;

    if (!anchor || !popover) {
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const clippingRect = getPopoverClippingRect(anchor);
    const measuredRect = popover.getBoundingClientRect();
    const preferredWidth = measuredRect.width || 320;
    const width = Math.min(preferredWidth, clippingRect.right - clippingRect.left);
    const preferredHeight = measuredRect.height || metadataPopoverMinimumHeight;
    const spaceBelow = Math.max(0, clippingRect.bottom - anchorRect.bottom - popoverGap);
    const spaceAbove = Math.max(0, anchorRect.top - clippingRect.top - popoverGap);
    const shouldOpenBelow =
      spaceBelow >= preferredHeight || (spaceBelow >= spaceAbove && spaceBelow > 0);
    const availableHeight = shouldOpenBelow ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(
      Math.min(metadataPopoverMinimumHeight, clippingRect.bottom - clippingRect.top),
      Math.floor(availableHeight)
    );
    const rawLeft =
      align === "end" ? anchorRect.right - width : Math.min(anchorRect.left, clippingRect.right);
    const left = clampNumber(rawLeft, clippingRect.left, clippingRect.right - width);
    const top = shouldOpenBelow
      ? Math.min(anchorRect.bottom + popoverGap, clippingRect.bottom - maxHeight)
      : Math.max(
          clippingRect.top,
          anchorRect.top - popoverGap - Math.min(preferredHeight, maxHeight)
        );

    setPosition({
      left,
      top,
      width,
      maxHeight,
      side: shouldOpenBelow ? "bottom" : "top"
    });
  }, [align, anchorRef, popoverRef]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    updatePosition();

    const handleUpdate = () => updatePosition();
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(handleUpdate);

    if (anchorRef.current) {
      resizeObserver?.observe(anchorRef.current);
    }
    if (popoverRef.current) {
      resizeObserver?.observe(popoverRef.current);
    }

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [anchorRef, popoverRef, updatePosition]);

  return position;
}

function useDismissableMetadataPopover({
  containerRef,
  popoverRef,
  isOpen,
  onDismiss,
  onEscape
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onDismiss: () => void;
  onEscape: () => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleMouseDown(event: MouseEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        (containerRef.current?.contains(target) || popoverRef.current?.contains(target))
      ) {
        return;
      }

      onDismiss();
    }

    function handleFocusIn(event: FocusEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        (containerRef.current?.contains(target) || popoverRef.current?.contains(target))
      ) {
        return;
      }

      onDismiss();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onEscape();
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, isOpen, onDismiss, onEscape, popoverRef]);
}

function getDraftFromStartsAt(startsAt: string | null, timeZone: string): DateTimeDraft {
  const date = startsAt ? new Date(startsAt) : new Date();

  return getZonedDateTimeParts(date, timeZone);
}

function getPopoverClippingRect(anchor: HTMLElement) {
  const rect = {
    top: popoverViewportPadding,
    right: window.innerWidth - popoverViewportPadding,
    bottom: window.innerHeight - popoverViewportPadding,
    left: popoverViewportPadding
  };
  let parent = anchor.parentElement;

  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const overflow = `${style.overflow} ${style.overflowX} ${style.overflowY}`;

    if (/(auto|scroll|hidden|clip)/.test(overflow)) {
      const parentRect = parent.getBoundingClientRect();

      rect.top = Math.max(rect.top, parentRect.top + popoverViewportPadding);
      rect.right = Math.min(rect.right, parentRect.right - popoverViewportPadding);
      rect.bottom = Math.min(rect.bottom, parentRect.bottom - popoverViewportPadding);
      rect.left = Math.max(rect.left, parentRect.left + popoverViewportPadding);
    }

    parent = parent.parentElement;
  }

  if (rect.right <= rect.left) {
    rect.left = popoverViewportPadding;
    rect.right = window.innerWidth - popoverViewportPadding;
  }

  if (rect.bottom <= rect.top) {
    rect.top = popoverViewportPadding;
    rect.bottom = window.innerHeight - popoverViewportPadding;
  }

  return rect;
}

function getZonedDateTimeParts(date: Date, timeZone: string): DateTimeDraft {
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = getPart("hour");

  return {
    year: getPart("year"),
    month: getPart("month") - 1,
    day: getPart("day"),
    hour: hour === 24 ? 0 : hour,
    minute: getPart("minute")
  };
}

function draftToStartsAt(draft: DateTimeDraft, timeZone: string) {
  const utcDraftTime = Date.UTC(draft.year, draft.month, draft.day, draft.hour, draft.minute);
  const utcGuess = new Date(utcDraftTime);
  const zonedGuess = getZonedDateTimeParts(utcGuess, timeZone);
  const zonedGuessAsUtc = Date.UTC(
    zonedGuess.year,
    zonedGuess.month,
    zonedGuess.day,
    zonedGuess.hour,
    zonedGuess.minute
  );

  return new Date(utcGuess.getTime() + (utcDraftTime - zonedGuessAsUtc)).toISOString();
}

function getEditorTimeZone(
  timezone: string | null | undefined,
  defaultTimezone?: string | null | undefined
) {
  if (timezone && isValidTimeZone(timezone)) {
    return timezone;
  }

  if (defaultTimezone && isValidTimeZone(defaultTimezone)) {
    return defaultTimezone;
  }

  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return browserTimeZone && isValidTimeZone(browserTimeZone) ? browserTimeZone : "UTC";
}

function getSupportedTimeZones() {
  const supportedValuesOf = (
    Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    }
  ).supportedValuesOf;

  return supportedValuesOf ? supportedValuesOf("timeZone") : fallbackTimeZones;
}

function getTimeZoneOptions(
  referenceStartsAt: string | null,
  selectedTimeZone: string,
  configuredTimeZone: string | null | undefined,
  defaultTimezone?: string | null | undefined
): TimeZoneOption[] {
  const browserTimeZone = getEditorTimeZone(undefined);
  const referenceDate = referenceStartsAt ? new Date(referenceStartsAt) : new Date();
  const zones = new Set([
    selectedTimeZone,
    configuredTimeZone && isValidTimeZone(configuredTimeZone) ? configuredTimeZone : null,
    defaultTimezone && isValidTimeZone(defaultTimezone) ? defaultTimezone : null,
    browserTimeZone,
    ...getSupportedTimeZones()
  ]);

  return Array.from(zones)
    .filter((zone): zone is string => typeof zone === "string" && isValidTimeZone(zone))
    .map((zone) => {
      const offsetMinutes = getTimeZoneOffsetMinutes(referenceDate, zone);
      const offsetLabel = formatTimeZoneOffsetLong(referenceStartsAt, zone);

      return {
        value: zone,
        offsetMinutes,
        offsetLabel,
        searchText: normalizeTimeZoneSearch(
          `${zone} ${zone.replace(/[/_-]/g, " ")} ${offsetLabel} ${formatOffsetSearchAliases(
            offsetMinutes
          )}`
        )
      };
    })
    .sort((left, right) =>
      left.offsetMinutes === right.offsetMinutes
        ? left.value.localeCompare(right.value)
        : left.offsetMinutes - right.offsetMinutes
    );
}

function filterTimeZoneOptions(options: TimeZoneOption[], searchValue: string) {
  const normalizedSearch = normalizeTimeZoneSearch(searchValue);

  if (!normalizedSearch) {
    return options;
  }

  return options.filter((option) => option.searchText.includes(normalizedSearch));
}

function normalizeTimeZoneSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/utc/g, "gmt")
    .replace(/[^a-z0-9+-]/g, "");
}

function formatOffsetSearchAliases(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteOffset / 60);
  const minutes = absoluteOffset % 60;
  const paddedHours = formatTwoDigit(hours);
  const paddedMinutes = formatTwoDigit(minutes);

  return [
    `GMT${sign}${hours}`,
    `GMT${sign}${paddedHours}`,
    `GMT${sign}${paddedHours}:${paddedMinutes}`,
    `${sign}${hours}`,
    `${sign}${paddedHours}`,
    `${sign}${paddedHours}:${paddedMinutes}`
  ].join(" ");
}

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeIsoToMinute(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  date.setSeconds(0, 0);

  return date.toISOString();
}

function getCalendarDays(year: number, month: number) {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const days: Array<number | null> = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(day);
  }

  return days;
}

function getWeekdayLabels(locale: string) {
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(2026, 5, 7 + index))
    )
  );
}

function formatMonthLabel(year: number, month: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(Date.UTC(year, month, 1)));
}

function formatDateLabel(year: number, month: number, day: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month, day)));
}

function formatScheduleValue(
  startsAt: string | null,
  timezone: string,
  t: ReturnType<typeof useTranslations>
) {
  if (!startsAt) {
    return t("unscheduled");
  }

  const start = new Date(startsAt);
  const parts = getZonedDateTimeParts(start, timezone);
  const day = formatTwoDigit(parts.day);
  const month = formatTwoDigit(parts.month + 1);
  const hour = formatTwoDigit(parts.hour);
  const minute = formatTwoDigit(parts.minute);

  return `${day}/${month}/${parts.year}, ${hour}:${minute} ${formatTimeZoneOffset(
    startsAt,
    timezone
  )}`;
}

function formatTimeZoneOffset(referenceStartsAt: string | null, timeZone: string) {
  const referenceDate = referenceStartsAt ? new Date(referenceStartsAt) : new Date();
  const offsetMinutes = getTimeZoneOffsetMinutes(referenceDate, timeZone);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteOffset / 60);
  const minutes = absoluteOffset % 60;

  return minutes === 0 ? `GMT${sign}${hours}` : `GMT${sign}${hours}:${formatTwoDigit(minutes)}`;
}

function formatTimeZoneOffsetLong(referenceStartsAt: string | null, timeZone: string) {
  const referenceDate = referenceStartsAt ? new Date(referenceStartsAt) : new Date();
  const offsetMinutes = getTimeZoneOffsetMinutes(referenceDate, timeZone);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteOffset / 60);
  const minutes = absoluteOffset % 60;

  return `GMT${sign}${formatTwoDigit(hours)}:${formatTwoDigit(minutes)}`;
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = getZonedDateTimeParts(date, timeZone);
  const zonedAsUtc = Date.UTC(parts.year, parts.month, parts.day, parts.hour, parts.minute);
  const dateAtMinute = new Date(date);
  dateAtMinute.setSeconds(0, 0);

  return Math.round((zonedAsUtc - dateAtMinute.getTime()) / 60_000);
}

function formatDurationMinutes(minutes: number, t: ReturnType<typeof useTranslations>) {
  const totalMinutes = Math.max(0, Math.round(minutes));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const remainingMinutes = totalMinutes % 60;
  const parts = [
    days > 0 ? t("durationParts.day", { count: days }) : null,
    hours > 0 ? t("durationParts.hour", { count: hours }) : null,
    remainingMinutes > 0 || (days === 0 && hours === 0)
      ? t("durationParts.minute", { count: remainingMinutes })
      : null
  ];

  return parts.filter((part): part is string => part !== null).join(" ");
}

function formatTwoDigit(value: number) {
  return value.toString().padStart(2, "0");
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function wrapNumber(value: number, min: number, max: number) {
  if (value > max) {
    return min;
  }

  if (value < min) {
    return max;
  }

  return value;
}
