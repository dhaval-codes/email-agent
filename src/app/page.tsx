"use client";

import { PrimaryButton } from "@/components/button";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const session = useSession();
  const router = useRouter();

  console.log("Session Data:", session);

  return (
    <div className="h-auto w-screen bg-white flex flex-col items-center justify-center gap-4 p-6 md:p-18">
      <h1 className="text-6xl font-bold mt-8">Welcome to Zenbox</h1>
      <span className="text-xl font-medium text-center w-full md:w-2/3">
        Zenbox is first of its kind AI Email companion that helps you manage
        your inbox more effectively. From summarizing long emails to generating
        quick replies, Zenbox is here to make your email experience smoother and
        more efficient.
      </span>
      {session.data?.user ? (
        <PrimaryButton
          label="Get Started"
          onClick={() => router.push("/home")}
        />
      ) : (
        <PrimaryButton label="Login" onClick={() => signIn()} />
      )}
    </div>
  );
}
