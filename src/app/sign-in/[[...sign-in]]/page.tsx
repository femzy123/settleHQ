import { SignIn } from "@clerk/nextjs";

import { AuthShell } from "@/components/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Secure access"
      title="Open your finance workspace."
      supportText="Sign in to manage collections, invoices, reconciliation, receipts, and wallet activity from one operational dashboard."
    >
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    </AuthShell>
  );
}
