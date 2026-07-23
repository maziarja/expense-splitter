import { Spinner } from "@/components/ui/spinner";

export default function GroupsLoading() {
  return (
    <main className="flex flex-1 items-center justify-center bg-bg-primary p-8">
      <Spinner className="size-6 text-text-tertiary" />
    </main>
  );
}
