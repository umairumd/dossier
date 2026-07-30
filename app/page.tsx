import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";

export default async function Home() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <p>
        Signed in as <strong>{profile.full_name}</strong> ({profile.role})
      </p>
      <form action={logout}>
        <button type="submit" className="rounded border px-4 py-2">
          Sign out
        </button>
      </form>
    </div>
  );
}
