"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateGroupInputSchema } from "@/lib/data/data-access";
import { useDataAccessContext } from "@/lib/data/data-access-context";
import type { Group, UpdateGroupInput } from "@/lib/data/types";
import { getCurrencyOptions } from "@/lib/splits/currency";

const CURRENCY_OPTIONS = getCurrencyOptions();

export function EditGroupDialog({
  group,
  hasExpenses,
  open,
  onOpenChange,
}: {
  group: Pick<Group, "id" | "name" | "description" | "currency">;
  hasExpenses: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dataAccess = useDataAccessContext();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<UpdateGroupInput>({
    resolver: zodResolver(updateGroupInputSchema),
    defaultValues: {
      name: group.name,
      description: group.description ?? "",
      currency: group.currency,
    },
  });

  async function onSubmit(values: UpdateGroupInput) {
    setSubmitError(null);
    try {
      await dataAccess.updateGroup(group.id, values);
      onOpenChange(false);
    } catch {
      setSubmitError("Couldn't save changes. Please try again.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          form.reset({
            name: group.name,
            description: group.description ?? "",
            currency: group.currency,
          });
        } else {
          setSubmitError(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit group</DialogTitle>
          <DialogDescription>
            Update the group&apos;s name, description, and default currency.
          </DialogDescription>
        </DialogHeader>
        <form id="edit-group-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Group name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Trip to Japan"
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Description{" "}
                    <span className="text-text-tertiary">(optional)</span>
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    placeholder="What's this group for?"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="currency"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-group-currency">
                    Default currency
                  </FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={hasExpenses}
                  >
                    <SelectTrigger
                      id="edit-group-currency"
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
                    {hasExpenses
                      ? "Currency can't be changed once the group has expenses — existing balances were converted using rates tied to the original currency."
                      : "Expenses in a different currency will convert to this one."}
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          {submitError && (
            <p role="alert" className="mt-3 text-xs text-destructive">
              {submitError}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form="edit-group-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
