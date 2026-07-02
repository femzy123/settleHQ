import { SignUp } from "@clerk/nextjs";

import { AuthShell } from "@/components/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Create workspace"
      title="Start with obligations, then collect cleanly."
      supportText="Create your SettleHQ account before connecting your organization, payers, collections, and Nomba-backed payment flow."
    >
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
      />
    </AuthShell>
  );
}
