export default function ShopLoading() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse px-4 pt-8 pb-20 sm:px-8 sm:pt-14"
      aria-busy="true"
      aria-label="Loading collection"
    >
      <div className="h-3 w-20 rounded bg-sage-soft" />
      <div className="mt-5 h-14 w-72 rounded bg-sage-soft sm:w-96" />
      <div className="mt-4 h-4 w-full max-w-lg rounded bg-sage-soft" />
      <div className="mt-7 flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-10 w-28 shrink-0 rounded-full bg-sage-soft" />
        ))}
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr]">
        <div className="hidden space-y-6 lg:block">
          <div className="h-32 rounded-2xl bg-sage-soft" />
          <div className="h-48 rounded-2xl bg-sage-soft" />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <div className="arch-soft aspect-[3/4] bg-sage-soft" />
              <div className="mt-3 h-3 w-24 rounded bg-sage-soft" />
              <div className="mt-2 h-4 w-40 rounded bg-sage-soft" />
              <div className="mt-2 h-4 w-20 rounded bg-sage-soft" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

