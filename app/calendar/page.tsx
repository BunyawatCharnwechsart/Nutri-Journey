import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  redirect("/stats?range=calendar");
}