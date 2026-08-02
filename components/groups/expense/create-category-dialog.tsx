"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DataAccessError } from "@/lib/data/data-access";
import {
  useDataAccessContext,
  useDataAccessRefresh,
} from "@/lib/data/data-access-context";
import type { Category } from "@/lib/data/types";
import { normalizeCategoryName } from "@/lib/splits/constants";

export function CreateCategoryDialog({
  groupId,
  existingNames,
  onCreated,
}: {
  groupId: string;
  existingNames: string[];
  onCreated: (category: Category) => void;
}) {
  const dataAccess = useDataAccessContext();
  const refresh = useDataAccessRefresh();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const normalized = normalizeCategoryName(name);
  const isDuplicate = existingNames.some(
    (existing) => existing.toLowerCase() === normalized.toLowerCase(),
  );

  async function onSubmit() {
    if (!normalized) {
      setError("Enter a category name.");
      return;
    }
    if (isDuplicate) {
      setError("That category already exists.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const category = await dataAccess.createCategory(groupId, {
        name: normalized,
      });
      onCreated(category);
      refresh();
      setOpen(false);
      setName("");
    } catch (err) {
      if (
        err instanceof DataAccessError &&
        err.code === "CATEGORY_NAME_TAKEN"
      ) {
        setError("That category already exists.");
      } else {
        setError("Couldn't create the category. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setName("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm">
          <PlusIcon aria-hidden="true" />
          <span className="sr-only">New category</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>
            Add a custom category for this group.
          </DialogDescription>
        </DialogHeader>
        <form
          id="create-category-form"
          onSubmit={(e) => {
            // Stop this from also bubbling to AddExpenseForm's own <form>:
            // this dialog's content is portaled to document.body, so it's
            // outside that form in the DOM, but React's synthetic events
            // bubble along the component tree, not the DOM tree — without
            // this, submitting a category could also submit (and close)
            // the expense form behind it.
            e.preventDefault();
            e.stopPropagation();
            void onSubmit();
          }}
        >
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="new-category-name">Name</FieldLabel>
            <Input
              id="new-category-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Pet supplies"
              aria-invalid={!!error}
              autoFocus
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
        </form>
        <DialogFooter>
          <Button type="submit" form="create-category-form" disabled={pending}>
            {pending ? "Adding…" : "Add category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
