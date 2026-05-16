import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function VerifyPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  const value = searchParams.value;

  if (!session) {
    redirect("/sign-in?callbackUrl=/electron/verify?value=" + value);
  }

  if (!value) {
    return (
      <div>
        <h1>Invalid Verification Link</h1>
      </div>
    );
  }

  const verification = await prisma.verificationCode.findUnique({
    where: {
      code: value as string,
    },
  });

  if (!verification) {
    return (
      <div>
        <h1>Invalid Verification Link</h1>
      </div>
    );
  }

 if(verification.expiresAt < new Date()){
    return (
      <div>
        <h1>Expired Verification Link</h1>
      </div>
    );
 }

   const electronUrl = `capture-screen-recorder://auth?token=${encodeURIComponent(
      session.session.token
    )}`;
    redirect(electronUrl);
 

  return (
    <div>
      <h1>Verify Page</h1>
    </div>
  );
}