"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateUserPreference } from "@/lib/actions/user-preferences";
import { currencyCodeSchema } from "@/lib/splits/schema";
import { getCurrencyOptions } from "@/lib/splits/currency";

const CURRENCY_OPTIONS = getCurrencyOptions();

const preferencesSchema = z.object({
  defaultCurrency: currencyCodeSchema,
  notificationsEnabled: z.boolean(),
});

type PreferencesValues = z.infer<typeof preferencesSchema>;

export function PreferencesForm({
  defaultCurrency,
  notificationsEnabled,
}: PreferencesValues) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<PreferencesValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: { defaultCurrency, notificationsEnabled },
  });

  async function onSubmit(values: PreferencesValues) {
    setSubmitError(null);
    try {
      await updateUserPreference(values);
      toast.success("Preferences saved");
    } catch {
      setSubmitError("Couldn't save your preferences. Please try again.");
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="defaultCurrency"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="preferences-default-currency">
                Default currency
              </FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id="preferences-default-currency"
                  aria-invalid={fieldState.invalid}
                  className="w-full"
                >
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.symbol} {option.code} — {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                New groups you create will default to this currency.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="notificationsEnabled"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FieldLabel htmlFor="preferences-notifications">
                  Notification emails
                </FieldLabel>
                <FieldDescription>
                  Receive email updates about activity in your groups.
                </FieldDescription>
              </FieldContent>
              <Switch
                id="preferences-notifications"
                name={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
            </Field>
          )}
        />
      </FieldGroup>
      {submitError && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {submitError}
        </p>
      )}
      <Button
        type="submit"
        className="mt-6 w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}
