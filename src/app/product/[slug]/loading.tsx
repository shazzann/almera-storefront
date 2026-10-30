export default function ProductLoading() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse px-4 pt-6 pb-20 sm:px-8 sm:pt-10"
      aria-busy="true"
      aria-label="Loading piece details"
    >
      <div className="mb-6 h-3 w-48 rounded bg-sage-soft" />
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <div className="arch aspect-[4/5] w-full bg-sage-soft" />
        <div className="space-y-6 pt-2">
          <div className="h-3 w-28 rounded bg-sage-soft" />
          <div className="h-12 w-3/4 rounded bg-sage-soft" />
          <div className="h-6 w-36 rounded bg-sage-soft" />
          <div className="h-24 w-full rounded-2xl bg-sage-soft" />
          <div className="h-12 w-full rounded-full bg-sage-soft" />
          <div className="h-32 w-full rounded-2xl bg-sage-soft" />
        </div>
      </div>
    </div>
  );
}

