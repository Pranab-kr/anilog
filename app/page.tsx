import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import HomePage from "@/components/HomePage";

export default async function mainPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Welcome to AniLog</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Hello, {session.user.name}!
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {session.user.email}
          </p>
          <HomePage />
        </div>
      </div>
    </div>
  );
}
