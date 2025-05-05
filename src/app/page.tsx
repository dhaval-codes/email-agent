"use client";
import LandingPage from "@/components/landingpage";
import { useSession } from "next-auth/react";

export default function Home() {
  // const session = useSession();
  return (
    <div className="min-h-screen w-screen bg-sky-100 sm:px-20 py-6 pt-24 text-black">
      <LandingPage />
    </div>
  );
}
