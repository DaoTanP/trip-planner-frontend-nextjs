"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useCreateTripMutation } from "../mutations/use-create-trip-mutation";
import { createTripSchema, type CreateTripFormValues } from "../schemas/trip.schemas";

export function CreateTripForm() {
  const tTrip = useTranslations("trip");
  const tValidation = useTranslations("validation");
  const createMutation = useCreateTripMutation();
  const schema = useMemo(() => createTripSchema(tValidation), [tValidation]);

  const form = useForm<CreateTripFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      startDate: "",
      endDate: ""
    }
  });

  return (
    <form
      className="grid gap-4 rounded-md border bg-card p-4"
      onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
    >
      <div className="grid gap-2">
        <Label htmlFor="trip-title">{tTrip("form.titleLabel")}</Label>
        <Input
          id="trip-title"
          placeholder={tTrip("form.titlePlaceholder")}
          aria-invalid={Boolean(form.formState.errors.title)}
          aria-describedby="trip-title-error"
          {...form.register("title")}
        />
        <FieldError id="trip-title-error" message={form.formState.errors.title?.message} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="trip-description">{tTrip("form.descriptionLabel")}</Label>
        <Input
          id="trip-description"
          placeholder={tTrip("form.descriptionPlaceholder")}
          aria-invalid={Boolean(form.formState.errors.description)}
          aria-describedby="trip-description-error"
          {...form.register("description")}
        />
        <FieldError
          id="trip-description-error"
          message={form.formState.errors.description?.message}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="trip-start-date">{tTrip("form.startDateLabel")}</Label>
          <Input
            id="trip-start-date"
            type="date"
            aria-invalid={Boolean(form.formState.errors.startDate)}
            aria-describedby="trip-start-date-error"
            {...form.register("startDate")}
          />
          <FieldError
            id="trip-start-date-error"
            message={form.formState.errors.startDate?.message}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="trip-end-date">{tTrip("form.endDateLabel")}</Label>
          <Input
            id="trip-end-date"
            type="date"
            aria-invalid={Boolean(form.formState.errors.endDate)}
            aria-describedby="trip-end-date-error"
            {...form.register("endDate")}
          />
          <FieldError id="trip-end-date-error" message={form.formState.errors.endDate?.message} />
        </div>
      </div>

      <Button type="submit" disabled={createMutation.isPending}>
        <Plus aria-hidden="true" />
        {tTrip("form.submit")}
      </Button>
    </form>
  );
}
