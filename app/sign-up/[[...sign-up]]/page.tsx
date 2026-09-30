import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFBF8] px-4 py-8">
      <Link href="/" className="mb-6 transition-transform hover:scale-105">
        <Image
          src="/logo.png"
          alt="Roamly - Travel Smarter Together"
          width={180}
          height={54}
          className="h-12 w-auto object-contain"
          priority
        />
      </Link>
      <SignUp fallbackRedirectUrl="/auth-redirect" forceRedirectUrl="/auth-redirect" />
    </div>
  );
}
