import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Join Gossips and set up your profile."
      footer={
        <p>
          Your profile is created automatically when you sign up.
        </p>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
