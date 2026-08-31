import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getOrganizationName = cache(async (): Promise<string | null> => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organizations")
    .select("name")
    .limit(1)
    .maybeSingle();

  return data?.name ?? null;
});
