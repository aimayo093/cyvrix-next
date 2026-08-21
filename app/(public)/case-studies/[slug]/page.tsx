import { notFound } from "next/navigation";

export function generateStaticParams() {
  // Cache Components require one build-time param for a dynamic route. This
  // deliberately invalid slug validates the route without publishing a story.
  return [{ slug: "__not-published__" }];
}

export default async function CaseStudyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;
  notFound();
}
