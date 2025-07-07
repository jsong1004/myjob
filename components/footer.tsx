import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="container flex flex-col items-center justify-center gap-2">
        <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
          © 2025 Startup Consulting Inc. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/privacy-policy"
            className="text-sm text-muted-foreground hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="text-sm text-muted-foreground hover:underline"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
} 