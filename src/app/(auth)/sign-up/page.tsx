import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/auth-forms";
import { AuthHeading } from "@/components/auth/auth-art";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <div className="animate-fade-up">
      <AuthHeading title="Plant your first seed" subtitle="Create a free account and start building habits that feel good." />
      <div className="mt-8">
        <SignUpForm />
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
