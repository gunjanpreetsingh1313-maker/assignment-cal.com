import { BookPublicClient } from "./book-public-client";

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <BookPublicClient slug={slug} />
    </div>
  );
}
