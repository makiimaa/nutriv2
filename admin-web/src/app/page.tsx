// src/app/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME ?? "admin_token")?.value;
  redirect(token ? "/dashboard" : "/login");
}
