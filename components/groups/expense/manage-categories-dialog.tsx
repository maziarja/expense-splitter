"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { pickCategoryColor } from "@/lib/data/category-color";
import { DataAccessError } from "@/lib/data/data-access";
import {
  useDataAccessContext,
  useDataAccessRefresh,
} from "@/lib/data/data-access-context";
import type { Category } from "@/lib/data/types";
import {
  normalizeCategoryName,
  PREDEFINED_CATEGORIES,
} from "@/lib/splits/constants";
import { AVATAR_COLOR_PALETTE } from "@/lib/data/avatar-color";
import { CategoryIcon } from "@/components/groups/expense/category-icon";
import { cn } from "@/lib/utils";

function CategoryListRow({
  groupId,
  category,
  onDeleted,
}: {
  groupId: string;
  category: Category;
  onDeleted: (category: Category) => void;
}) {
  const dataAccess = useDataAccessContext();
  const refresh = useDataAccessRefresh();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await dataAccess.deleteCategory(groupId, category.id);
      setOpen(false);
      onDeleted(category);
      refresh();
    } catch (err) {
      if (err instanceof DataAccessError && err.code === "CATEGORY_NOT_FOUND") {
        // Already gone (e.g. deleted from another tab) — treat as success.
        setOpen(false);
        onDeleted(category);
        refresh();
      } else {
        setError("Couldn't delete this category. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-2 py-1">
      <span className="flex items-center gap-2 text-sm text-text-primary">
        <CategoryIcon category={category.name} color={category.color} />
        {category.name}
      </span>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-text-tertiary hover:text-destructive"
          >
            <XIcon aria-hidden="true" />
            <span className="sr-only">Delete {category.name}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {category.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Expenses that used this category will keep showing its name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

export function ManageCategoriesDialog({
  groupId,
  categories,
  onCreated,
  onDeleted,
}: {
  groupId: string;
  categories: Category[];
  onCreated: (category: Category) => void;
  onDeleted: (category: Category) => void;
}) {
  const dataAccess = useDataAccessContext();
  const refresh = useDataAccessRefresh();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(() =>
    pickCategoryColor(categories.map((c) => c.color)),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const existingNames = [
    ...PREDEFINED_CATEGORIES,
    ...categories.map((c) => c.name),
  ];
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
        color,
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
          setColor(pickCategoryColor(categories.map((c) => c.color)));
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm">
          <PlusIcon aria-hidden="true" />
          <span className="sr-only">Manage categories</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage categories</DialogTitle>
          <DialogDescription>
            Add a custom category or remove one you no longer need.
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
          <FieldGroup>
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
            <Field>
              <FieldLabel>Color</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLOR_PALETTE.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={`Choose color ${swatch}`}
                    aria-pressed={color === swatch}
                    onClick={() => setColor(swatch)}
                    className={cn(
                      "size-7 rounded-full transition",
                      color === swatch
                        ? "ring-2 ring-ring ring-offset-2 ring-offset-popover"
                        : "hover:scale-110",
                    )}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </Field>
          </FieldGroup>
        </form>
        {categories.length > 0 && (
          <div className="flex flex-col gap-1">
            <FieldLabel>Your categories</FieldLabel>
            <ul className="flex flex-col divide-y divide-border-subtle">
              {categories.map((category) => (
                <CategoryListRow
                  key={category.id}
                  groupId={groupId}
                  category={category}
                  onDeleted={onDeleted}
                />
              ))}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button type="submit" form="create-category-form" disabled={pending}>
            {pending ? "Adding…" : "Add category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
