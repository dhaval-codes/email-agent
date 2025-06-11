"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { PrimaryButton, SecondaryButton } from "./button";
import { useState, useEffect, useRef } from "react";

export default function AppHeader() {
  const session = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const signInFunction = () => {
    signIn(undefined, { callbackUrl: "/home" });
  };

  return (
    <div className="absolute w-screen p-6 h-18 md:px-18 flex justify-between items-center bg-white border-b">
      <span className="m-0 font-semibold text-xl">Zenbox</span>
      <div className="flex items-center justify-center w-auto h-full gap-4">
        {session.data?.user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleDropdown}
              className="flex items-center justify-between gap-2 px-2 py-2 bg-blue-200 rounded-full"
            >
              <img
                src={session.data.user.image || "/default-avatar.png"}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
              <span>{session.data.user.name}</span>
            </button>
            {isDropdownOpen && <ProfileDropdown session={session} />}
          </div>
        ) : (
          <>
            <span className="m-0 font-medium text-md">Features</span>
            <span className="m-0 font-medium text-md">Pricing</span>
            <PrimaryButton label="Login" onClick={() => signInFunction()} />
          </>
        )}
      </div>
    </div>
  );
}

const ProfileDropdown = ({ session }: { session: any }) => {
  const signOutFunction = () => {
    signOut({ callbackUrl: "/" });
  };
  return (
    <div className="absolute flex flex-col justify-center p-4 gap-4 right-0 mt-2 w-75 bg-white border rounded shadow-lg">
      <div className="w-full h-auto flex items-center justify-center">
        <img
          src={session.data.user.image || "/default-avatar.png"}
          alt="Profile"
          className="w-32 h-32 rounded-full border border-blue-200 border-4"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-md  font-semibold">Name:</label>
        <span className="text-xl font-medium">{session.data.user.name}</span>
      </div>
      <div className="flex flex-col">
        <label className="text-md  font-semibold">Email:</label>
        <span className="text-xl font-medium">{session.data.user.email}</span>
      </div>
      <div className="w-full h-auto flex items-center gap-2 justify-center">
        <SecondaryButton
          label="Sign Out"
          onClick={() => {
            signOutFunction();
          }}
        />
        <PrimaryButton label="Profile" onClick={() => {}} />
      </div>
    </div>
  );
};
