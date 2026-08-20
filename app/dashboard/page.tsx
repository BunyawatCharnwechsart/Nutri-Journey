import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import PagePlaceholder from "@/components/PagePlaceholder";
import EggIconLink from "@/components/EggIconLink";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  return <PagePlaceholder title="หน้าหลัก" action={<EggIconLink />} />;
}