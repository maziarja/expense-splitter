"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { createGroupInputSchema } from "@/lib/data/data-access";
import { useCreateGroupDialogStore } from "@/lib/data/create-group-dialog-store";
import { guestDataAccess } from "@/lib/data/guest-store";
import type { CreateGroupInput } from "@/lib/data/types";
import { getCurrencyOptions } from "@/lib/splits/currency";

const CURRENCY_OPTIONS = getCurrencyOptions();

export function CreateGroupDialog() {
  const router = useRouter();
  const open = useCreateGroupDialogStore((state) => state.open);
  const setOpen = useCreateGroupDialogStore((state) => state.setOpen);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupInputSchema),
    defaultValues: { name: "", description: "", currency: "USD" },
  });

  async function onSubmit(values: CreateGroupInput) {
    setSubmitError(null);
    try {
      const group = await guestDataAccess.createGroup(values);
      setOpen(false);
      router.push(`/groups/${group.id}`);
    } catch {
      setSubmitError("Couldn't create the group. Please try again.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setSubmitError(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>
            Give your group a name, an optional description, and the currency
            expenses will default to.
          </DialogDescription>
        </DialogHeader>
        <form id="create-group-form" onSubmit={form.handleSubmit(onSubmit)}>
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
                  <FieldLabel htmlFor="create-group-currency">
                    Default currency
                  </FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="create-group-currency"
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
                    Expenses in a different currency will convert to this one.
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
            form="create-group-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Creating…" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
