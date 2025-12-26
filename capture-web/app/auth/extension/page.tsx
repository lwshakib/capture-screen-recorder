import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ExtensionAuthPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const redirectUri = searchParams.redirect_uri as string;

  if (!redirectUri) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-xl font-semibold">
          Missing redirect_uri parameter
        </h1>
      </div>
    );
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Redirect to sign-in and then back here
    const callbackUrl = `/auth/extension?redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // Redirect back to the extension with the token
  const token = session.session.token;
  const url = new URL(redirectUri);
  url.searchParams.set("token", token);

  redirect(url.toString());
}
