"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import React from "react";

const HomePage = () => {
  const router = useRouter();

  const handleLogout = async () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  };

  return (
    <div>
      <button
        onClick={handleLogout}
        className="mt-6 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
      >
        logout
      </button>
    </div>
  );
};

export default HomePage;
