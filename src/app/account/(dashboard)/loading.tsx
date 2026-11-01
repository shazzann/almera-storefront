import { Skeleton } from "@/components/admin/ui";

export default function Loading() {
  return (
    <div className="space-y-3 px-4 pt-6 lg:px-0 lg:pt-0" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-44" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
  );
}
