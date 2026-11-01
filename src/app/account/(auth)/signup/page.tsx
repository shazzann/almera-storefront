import { Suspense } from "react";
import { SignupForm } from "@/components/account/auth-forms";

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-20 text-center text-ink/60">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
