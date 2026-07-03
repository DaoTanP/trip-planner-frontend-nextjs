"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Check, MessageSquare, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { FieldError } from "@/components/shared/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PresenceIndicator } from "@/modules/collaboration/components/presence-indicator";
import {
  useEntityPresenceEntries,
  usePresenceSource,
  useUniquePresenceUsers
} from "@/modules/collaboration/hooks/use-presence";
import { useSession } from "@/modules/auth/hooks/use-session";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import { NotePanel } from "@/modules/notes/components/note-panel";
import { getPlaceMap } from "@/modules/trips/utils/trip-editor.utils";
import type { PlaceDto } from "@/services/api/contracts";
import { semanticColorClassNames } from "@/theme";

import {
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useUpdateExpenseMutation,
  useUpsertBudgetMutation
} from "../mutations/use-expense-mutations";
import {
  tripBudgetQueryOptions,
  tripExpensesInfiniteQueryOptions
} from "../queries/expense.queries";
import type { TripExpense, TripExpenseCategory } from "../types/expense.types";

interface BudgetExpensePanelProps {
  tripId: string;
  items: ItineraryItem[];
  places: PlaceDto[];
}

export function BudgetExpensePanel({ tripId, items, places }: BudgetExpensePanelProps) {
  const t = useTranslations("trip.editor.budget");
  const locale = useLocale();
  const expensesQuery = useInfiniteQuery(tripExpensesInfiniteQueryOptions(tripId));
  const budgetQuery = useQuery(tripBudgetQueryOptions(tripId));
  const upsertBudget = useUpsertBudgetMutation(tripId);
  const createExpense = useCreateExpenseMutation(tripId);
  const updateExpense = useUpdateExpenseMutation(tripId);
  const deleteExpense = useDeleteExpenseMutation(tripId);
  const sessionQuery = useSession();
  const currentUserId = sessionQuery.data?.user.id;
  const expensePages = expensesQuery.data?.pages;
  const expenses = useMemo(
    () => expensePages?.flatMap((page) => page.expenses) ?? [],
    [expensePages]
  );
  const categories = useMemo<TripExpenseCategory[]>(
    () => expensePages?.[0]?.categories ?? [],
    [expensePages]
  );
  const expenseSummary = expensePages?.[0]?.summary ?? null;
  const summary = budgetQuery.data ?? expenseSummary;
  const [budgetCurrencyDraft, setBudgetCurrencyDraft] = useState<string | null>(null);
  const [budgetLimitDraft, setBudgetLimitDraft] = useState<string | null>(null);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCurrencyDraft, setExpenseCurrencyDraft] = useState<string | null>(null);
  const [expenseItemId, setExpenseItemId] = useState("");
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expandedExpenseNotesId, setExpandedExpenseNotesId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
  const [expenseDraft, setExpenseDraft] = useState({
    title: "",
    amount: "",
    currency: "USD",
    itineraryItemId: "",
    categoryId: ""
  });
  const orderedItems = useMemo(
    () =>
      [...items].sort((left, right) =>
        left.sortOrder === right.sortOrder
          ? left.id.localeCompare(right.id)
          : left.sortOrder - right.sortOrder
      ),
    [items]
  );
  const placeMap = useMemo(() => getPlaceMap(places), [places]);
  const itemLabelById = useMemo(
    () =>
      new Map(
        orderedItems.map((item, index) => {
          const place = placeMap.get(item.placeId);

          return [item.id, `${index + 1}. ${place?.name ?? t("unknownStop")}`];
        })
      ),
    [orderedItems, placeMap, t]
  );
  const categoryLabelById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );
  const budgetCurrency = budgetCurrencyDraft ?? summary?.currency ?? "USD";
  const budgetLimit =
    budgetLimitDraft ??
    (summary?.budgetLimit === null || summary?.budgetLimit === undefined
      ? ""
      : String(summary.budgetLimit));
  const expenseCurrency = expenseCurrencyDraft ?? summary?.currency ?? "USD";
  const budgetPresenceEntries = useEntityPresenceEntries({
    tripId,
    entityType: "BUDGET",
    entityId: tripId,
    excludeUserId: currentUserId
  });
  const activeBudgetPresence = useUniquePresenceUsers(budgetPresenceEntries);
  usePresenceSource({
    tripId,
    entityType: "BUDGET",
    entityId: tripId,
    state: "EDITING",
    priority: 3,
    enabled: budgetCurrencyDraft !== null || budgetLimitDraft !== null
  });
  usePresenceSource({
    tripId,
    entityType: "EXPENSE",
    entityId: editingExpenseId ?? "__no_expense__",
    state: "EDITING",
    priority: 3,
    enabled: editingExpenseId !== null
  });

  function handleSaveBudget() {
    const nextErrors: Record<string, string | undefined> = {};
    const currency = budgetCurrency.trim().toUpperCase();
    const limitText = budgetLimit.trim();
    let parsedLimit: number | null = null;

    if (!isValidCurrency(currency)) {
      nextErrors.budgetCurrency = t("errors.currency");
    }

    if (limitText) {
      const parsed = Number(limitText);

      if (!Number.isFinite(parsed) || parsed < 0) {
        nextErrors.budgetLimit = t("errors.nonNegativeAmount");
      } else {
        parsedLimit = parsed;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors((current) => ({ ...current, ...nextErrors }));
      return;
    }
    setFormErrors((current) => ({
      ...current,
      budgetCurrency: undefined,
      budgetLimit: undefined
    }));

    upsertBudget.mutate(
      {
        currency,
        totalLimit: parsedLimit,
        clientMutationId: crypto.randomUUID()
      },
      {
        onSuccess: () => {
          setBudgetCurrencyDraft(null);
          setBudgetLimitDraft(null);
          setFormErrors((current) => ({
            ...current,
            budgetCurrency: undefined,
            budgetLimit: undefined
          }));
        }
      }
    );
  }

  function handleCreateExpense() {
    const amount = Number(expenseAmount);
    const title = expenseTitle.trim();
    const currency = expenseCurrency.trim().toUpperCase();
    const nextErrors: Record<string, string | undefined> = {};

    if (!title) {
      nextErrors.expenseTitle = t("errors.title");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.expenseAmount = t("errors.positiveAmount");
    }
    if (!isValidCurrency(currency)) {
      nextErrors.expenseCurrency = t("errors.currency");
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors((current) => ({ ...current, ...nextErrors }));
      return;
    }
    setFormErrors((current) => ({
      ...current,
      expenseTitle: undefined,
      expenseAmount: undefined,
      expenseCurrency: undefined
    }));

    createExpense.mutate(
      {
        title,
        amount,
        currency,
        categoryId: expenseCategoryId || null,
        itineraryItemId: expenseItemId || null,
        clientMutationId: crypto.randomUUID()
      },
      {
        onSuccess: () => {
          setExpenseTitle("");
          setExpenseAmount("");
          setExpenseItemId("");
          setExpenseCategoryId("");
          setExpenseCurrencyDraft(null);
          setFormErrors((current) => ({
            ...current,
            expenseTitle: undefined,
            expenseAmount: undefined,
            expenseCurrency: undefined
          }));
        }
      }
    );
  }

  function startEditingExpense(expense: TripExpense) {
    setEditingExpenseId(expense.id);
    setExpenseDraft({
      title: expense.title,
      amount: String(expense.amount),
      currency: expense.currency,
      itineraryItemId: expense.itineraryItemId ?? "",
      categoryId: expense.categoryId ?? ""
    });
  }

  function cancelEditingExpense() {
    setEditingExpenseId(null);
    setFormErrors((current) => ({
      ...current,
      editTitle: undefined,
      editAmount: undefined,
      editCurrency: undefined
    }));
    setExpenseDraft({
      title: "",
      amount: "",
      currency: summary?.currency ?? "USD",
      itineraryItemId: "",
      categoryId: ""
    });
  }

  function handleUpdateExpense(expense: TripExpense) {
    const amount = Number(expenseDraft.amount);
    const title = expenseDraft.title.trim();
    const currency = expenseDraft.currency.trim().toUpperCase();
    const nextErrors: Record<string, string | undefined> = {};

    if (!title) {
      nextErrors.editTitle = t("errors.title");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.editAmount = t("errors.positiveAmount");
    }
    if (!isValidCurrency(currency)) {
      nextErrors.editCurrency = t("errors.currency");
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors((current) => ({ ...current, ...nextErrors }));
      return;
    }
    setFormErrors((current) => ({
      ...current,
      editTitle: undefined,
      editAmount: undefined,
      editCurrency: undefined
    }));

    updateExpense.mutate(
      {
        expenseId: expense.id,
        payload: {
          title,
          amount,
          currency,
          categoryId: expenseDraft.categoryId || null,
          itineraryItemId: expenseDraft.itineraryItemId || null,
          expectedVersion: expense.version,
          clientMutationId: crypto.randomUUID()
        }
      },
      {
        onSuccess: () => {
          setFormErrors((current) => ({
            ...current,
            editTitle: undefined,
            editAmount: undefined,
            editCurrency: undefined
          }));
          cancelEditingExpense();
        }
      }
    );
  }

  return (
    <section className="grid gap-3">
      {budgetQuery.isLoading || expensesQuery.isLoading ? (
        <div className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
          {t("loading")}
        </div>
      ) : null}

      {budgetQuery.isError || expensesQuery.isError ? (
        <div
          className={cn(
            "grid gap-2 rounded-md border p-3 text-sm",
            semanticColorClassNames.errorSubtle
          )}
        >
          <span>{t("loadError")}</span>
          <div className="flex flex-wrap gap-2">
            {budgetQuery.isError ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void budgetQuery.refetch()}
              >
                {t("retryBudget")}
              </Button>
            ) : null}
            {expensesQuery.isError ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void expensesQuery.refetch()}
              >
                {t("retryExpenses")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 rounded-md border bg-card p-3">
        {activeBudgetPresence.length > 0 ? (
          <div className="flex justify-end">
            <PresenceIndicator entries={activeBudgetPresence} />
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-4">
          <SummaryMetric
            label={t("spent")}
            value={formatMoney(
              summary?.spentAmount ?? 0,
              summary?.currency ?? expenseCurrency,
              locale
            )}
          />
          <SummaryMetric
            label={t("limit")}
            value={
              summary?.budgetLimit === null || summary?.budgetLimit === undefined
                ? t("notSet")
                : formatMoney(summary.budgetLimit, summary.currency, locale)
            }
          />
          <SummaryMetric
            label={t("remaining")}
            value={
              summary?.remainingAmount === null || summary?.remainingAmount === undefined
                ? t("notSet")
                : formatMoney(summary.remainingAmount, summary.currency, locale)
            }
          />
          <SummaryMetric
            label={t("usage")}
            value={
              summary?.usagePercentage === null || summary?.usagePercentage === undefined
                ? t("notSet")
                : `${Math.round(summary.usagePercentage)}%`
            }
          />
        </div>

        <div className="grid gap-2 border-t pt-3 sm:grid-cols-[8rem_1fr_auto]">
          <div className="grid gap-1">
            <Label htmlFor="budget-currency">{t("currency")}</Label>
            <Input
              id="budget-currency"
              value={budgetCurrency}
              maxLength={3}
              aria-invalid={Boolean(formErrors.budgetCurrency)}
              aria-describedby="budget-currency-error"
              onChange={(event) => {
                setBudgetCurrencyDraft(event.target.value.toUpperCase());
              }}
            />
            <FieldError id="budget-currency-error" message={formErrors.budgetCurrency} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="budget-limit">{t("totalLimit")}</Label>
            <Input
              id="budget-limit"
              inputMode="decimal"
              value={budgetLimit}
              aria-invalid={Boolean(formErrors.budgetLimit)}
              aria-describedby="budget-limit-error"
              onChange={(event) => {
                setBudgetLimitDraft(event.target.value);
              }}
            />
            <FieldError id="budget-limit-error" message={formErrors.budgetLimit} />
          </div>
          <Button
            type="button"
            className="self-end"
            disabled={upsertBudget.isPending}
            onClick={handleSaveBudget}
          >
            <Save aria-hidden="true" />
            {t("saveBudget")}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 rounded-md border bg-card p-3">
        <div className="grid gap-2 lg:grid-cols-[1fr_8rem_7rem_1fr_1fr_auto]">
          <div className="grid gap-1">
            <Label htmlFor="expense-title">{t("expenseTitle")}</Label>
            <Input
              id="expense-title"
              value={expenseTitle}
              aria-invalid={Boolean(formErrors.expenseTitle)}
              aria-describedby="expense-title-error"
              onChange={(event) => setExpenseTitle(event.target.value)}
            />
            <FieldError id="expense-title-error" message={formErrors.expenseTitle} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="expense-amount">{t("amount")}</Label>
            <Input
              id="expense-amount"
              inputMode="decimal"
              value={expenseAmount}
              aria-invalid={Boolean(formErrors.expenseAmount)}
              aria-describedby="expense-amount-error"
              onChange={(event) => setExpenseAmount(event.target.value)}
            />
            <FieldError id="expense-amount-error" message={formErrors.expenseAmount} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="expense-currency">{t("currency")}</Label>
            <Input
              id="expense-currency"
              value={expenseCurrency}
              maxLength={3}
              aria-invalid={Boolean(formErrors.expenseCurrency)}
              aria-describedby="expense-currency-error"
              onChange={(event) => setExpenseCurrencyDraft(event.target.value.toUpperCase())}
            />
            <FieldError id="expense-currency-error" message={formErrors.expenseCurrency} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="expense-stop">{t("linkedStop")}</Label>
            <select
              id="expense-stop"
              value={expenseItemId}
              className="h-10 rounded-md border bg-background px-2 text-sm"
              onChange={(event) => setExpenseItemId(event.target.value)}
            >
              <option value="">{t("tripLevel")}</option>
              {orderedItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {itemLabelById.get(item.id)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="expense-category">{t("category")}</Label>
            <select
              id="expense-category"
              value={expenseCategoryId}
              className="h-10 rounded-md border bg-background px-2 text-sm"
              onChange={(event) => setExpenseCategoryId(event.target.value)}
            >
              <option value="">{t("uncategorized")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            className="self-end"
            disabled={createExpense.isPending}
            onClick={handleCreateExpense}
          >
            <Plus aria-hidden="true" />
            {t("addExpense")}
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        {expenses.map((expense) => {
          const isEditing = editingExpenseId === expense.id;
          const areNotesOpen = expandedExpenseNotesId === expense.id;
          const stopLabel = expense.itineraryItemId
            ? (itemLabelById.get(expense.itineraryItemId) ?? t("unknownStop"))
            : t("tripLevel");
          const categoryLabel = expense.categoryId
            ? (categoryLabelById.get(expense.categoryId) ?? t("uncategorized"))
            : t("uncategorized");

          return (
            <article key={expense.id} className="grid gap-3 rounded-md border bg-card p-3">
              {isEditing ? (
                <div className="grid gap-2 lg:grid-cols-[1fr_8rem_7rem_1fr_1fr_auto]">
                  <div className="grid gap-1">
                    <Label htmlFor={`expense-title-${expense.id}`}>{t("expenseTitle")}</Label>
                    <Input
                      id={`expense-title-${expense.id}`}
                      value={expenseDraft.title}
                      aria-invalid={Boolean(formErrors.editTitle)}
                      aria-describedby={`expense-title-${expense.id}-error`}
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          title: event.target.value
                        }))
                      }
                    />
                    <FieldError
                      id={`expense-title-${expense.id}-error`}
                      message={formErrors.editTitle}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`expense-amount-${expense.id}`}>{t("amount")}</Label>
                    <Input
                      id={`expense-amount-${expense.id}`}
                      inputMode="decimal"
                      value={expenseDraft.amount}
                      aria-invalid={Boolean(formErrors.editAmount)}
                      aria-describedby={`expense-amount-${expense.id}-error`}
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          amount: event.target.value
                        }))
                      }
                    />
                    <FieldError
                      id={`expense-amount-${expense.id}-error`}
                      message={formErrors.editAmount}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`expense-currency-${expense.id}`}>{t("currency")}</Label>
                    <Input
                      id={`expense-currency-${expense.id}`}
                      value={expenseDraft.currency}
                      maxLength={3}
                      aria-invalid={Boolean(formErrors.editCurrency)}
                      aria-describedby={`expense-currency-${expense.id}-error`}
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          currency: event.target.value.toUpperCase()
                        }))
                      }
                    />
                    <FieldError
                      id={`expense-currency-${expense.id}-error`}
                      message={formErrors.editCurrency}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`expense-stop-${expense.id}`}>{t("linkedStop")}</Label>
                    <select
                      id={`expense-stop-${expense.id}`}
                      value={expenseDraft.itineraryItemId}
                      className="h-10 rounded-md border bg-background px-2 text-sm"
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          itineraryItemId: event.target.value
                        }))
                      }
                    >
                      <option value="">{t("tripLevel")}</option>
                      {orderedItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {itemLabelById.get(item.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`expense-category-${expense.id}`}>{t("category")}</Label>
                    <select
                      id={`expense-category-${expense.id}`}
                      value={expenseDraft.categoryId}
                      className="h-10 rounded-md border bg-background px-2 text-sm"
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          categoryId: event.target.value
                        }))
                      }
                    >
                      <option value="">{t("uncategorized")}</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end gap-1">
                    <Button
                      type="button"
                      size="icon"
                      aria-label={t("saveExpense")}
                      disabled={updateExpense.isPending}
                      onClick={() => handleUpdateExpense(expense)}
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("cancel")}
                      onClick={cancelEditingExpense}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-sm font-medium">{expense.title}</h3>
                      <ExpensePresenceIndicator
                        tripId={tripId}
                        expenseId={expense.id}
                        currentUserId={currentUserId}
                      />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {stopLabel} / {categoryLabel}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {formatMoney(expense.amount, expense.currency, locale)}
                  </span>
                  <div className="flex items-center gap-1 justify-self-start sm:justify-self-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t("expenseNotes")}
                      onClick={() => setExpandedExpenseNotesId(areNotesOpen ? null : expense.id)}
                    >
                      <MessageSquare className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t("editExpense")}
                      disabled={updateExpense.isPending}
                      onClick={() => startEditingExpense(expense)}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t("deleteExpense")}
                      disabled={deleteExpense.isPending}
                      onClick={() =>
                        deleteExpense.mutate({
                          expenseId: expense.id,
                          params: { clientMutationId: crypto.randomUUID() }
                        })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}

              {areNotesOpen ? (
                <div className="border-t pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {t("expenseNotes")}
                  </p>
                  <NotePanel
                    tripId={tripId}
                    targetEntityType="EXPENSE"
                    targetEntityId={expense.id}
                    compact
                  />
                </div>
              ) : null}
            </article>
          );
        })}

        {expenses.length === 0 && !expensesQuery.isLoading ? (
          <div className="rounded-md border border-dashed bg-card p-4 text-sm text-muted-foreground">
            {t("emptyExpenses")}
          </div>
        ) : null}

        {expensesQuery.hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            disabled={expensesQuery.isFetchingNextPage}
            onClick={() => void expensesQuery.fetchNextPage()}
          >
            {expensesQuery.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function ExpensePresenceIndicator({
  tripId,
  expenseId,
  currentUserId
}: {
  tripId: string;
  expenseId: string;
  currentUserId?: string | undefined;
}) {
  const presenceEntries = useEntityPresenceEntries({
    tripId,
    entityType: "EXPENSE",
    entityId: expenseId,
    excludeUserId: currentUserId
  });
  const activePresence = useUniquePresenceUsers(presenceEntries);

  return activePresence.length > 0 ? <PresenceIndicator entries={activePresence} /> : null;
}

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(amount);
}

function isValidCurrency(value: string) {
  return /^[A-Z]{3}$/.test(value);
}
