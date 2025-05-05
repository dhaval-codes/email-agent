"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { PrimaryButton, SecondaryButton } from "./button";

export default function AppHeader() {
  const session = useSession();

  const signInFunction = () => {
    signIn(undefined, { callbackUrl: "/chat" });
  };

  const signOutFunction = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <div>
      <div className="w-screen h-18 bg-blue-500 py-6 px-20 absolute flex justify-between items-center">
        <span className="m-0 font-semibold">Talk Email Talk!</span>
        {session.data?.user ? (
          <SecondaryButton label="Logout" onClick={() => signOutFunction()} />
        ) : (
          <PrimaryButton label="Login" onClick={() => signInFunction()} />
        )}
      </div>
    </div>
  );
}
