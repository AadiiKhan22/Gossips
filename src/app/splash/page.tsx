import { SplashScreen } from "@/components/splash/splash-screen";
import { getUser } from "@/lib/auth/get-user";

export default async function SplashPage() {
  const user = await getUser();
  const redirectTo = user ? "/" : "/login";

  return <SplashScreen redirectTo={redirectTo} />;
}
