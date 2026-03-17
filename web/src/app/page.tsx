import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as { role: string }).role;

  if (role === "admin") {
    redirect("/admin");
  } else if (role === "responsabile") {
    redirect("/responsabile");
  } else {
    redirect("/ore");
  }
}
