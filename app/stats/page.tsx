import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import PagePlaceholder from "@/components/PagePlaceholder";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  return <PagePlaceholder title="สถิติ" />;
}