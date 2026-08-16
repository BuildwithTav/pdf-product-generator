export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  const message =
    reason === "not_a_member"
      ? "This email isn't on the member list yet. If you're part of the community, ask an admin to add you."
      : "That sign-in link is invalid or has expired. Request a new one.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-neutral-900">Sign-in failed</h1>
        <p className="mb-6 text-sm text-neutral-500">{message}</p>
        <a
          href="/login"
          className="inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Back to sign in
        </a>
      </div>
    </div>
  );
}
