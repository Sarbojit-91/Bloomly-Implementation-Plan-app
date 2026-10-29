import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/auth-forms";
import { AuthHeading } from "@/components/auth/auth-art";
import { requireUser } from "@/lib/data";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const user = await requireUser();
  return (
    <div className="animate-fade-up">
      <AuthHeading title="Choose a new password" subtitle={`Setting a new password for ${user.email}.`} />
      <div className="mt-8">
        <NewPasswordForm />
      </div>
    </div>
  );
}
