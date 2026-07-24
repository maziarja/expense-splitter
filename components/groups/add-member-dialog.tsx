"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { UserPlusIcon } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AVATAR_COLOR_PALETTE, pickAvatarColor } from "@/lib/data/avatar-color";
import { guestDataAccess } from "@/lib/data/guest-store";
import type { Member } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const addMemberFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z
    .string()
    .optional()
    .refine((v) => !v || z.email().safeParse(v).success, {
      message: "Enter a valid email",
    }),
  avatarColor: z.string().min(1),
});

type AddMemberFormValues = z.infer<typeof addMemberFormSchema>;

export function AddMemberDialog({
  groupId,
  activeMembers,
}: {
  groupId: string;
  activeMembers: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberFormSchema),
    defaultValues: { name: "", email: "", avatarColor: "" },
  });

  async function onSubmit(values: AddMemberFormValues) {
    setSubmitError(null);
    try {
      await guestDataAccess.addMember(groupId, {
        name: values.name,
        email: values.email?.trim() ? values.email.trim() : undefined,
        avatarColor: values.avatarColor,
      });
      setOpen(false);
    } catch {
      setSubmitError("Couldn't add the member. Please try again.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          form.reset({
            name: "",
            email: "",
            avatarColor: pickAvatarColor(activeMembers),
          });
        } else {
          setSubmitError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <UserPlusIcon aria-hidden="true" />
          <span className="sr-only">Add member</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            Add someone by name. They don&apos;t need an account to be included
            in splits and balances.
          </DialogDescription>
        </DialogHeader>
        <form
          id="add-member-form"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Jamie Lee"
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
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Email <span className="text-text-tertiary">(optional)</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    placeholder="jamie@example.com"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="avatarColor"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Avatar color</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Choose color ${color}`}
                        aria-pressed={field.value === color}
                        onClick={() => field.onChange(color)}
                        className={cn(
                          "size-7 rounded-full transition",
                          field.value === color
                            ? "ring-2 ring-ring ring-offset-2 ring-offset-popover"
                            : "hover:scale-110",
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
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
            form="add-member-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Adding…" : "Add member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
