import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10 sm:p-8"
      data-accent="default"
    >
      <div className="flex items-center gap-2.5">
        <Image
          src="/logo.png"
          alt=""
          width={32}
          height={32}
          style={{ width: 32, height: 32 }}
        />
        <span className="text-lg font-semibold tracking-tight">Dossier</span>
      </div>
      <main className="flex w-full max-w-sm flex-col gap-4">{children}</main>
    </div>
  );
}
