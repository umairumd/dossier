export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-svh items-center justify-center p-8"
      data-accent="default"
    >
      {children}
    </div>
  );
}
