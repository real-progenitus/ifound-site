/**
 * The cloakroom page is entirely client-side (it reads the location id with
 * useParams and talks to /api/cloakroom), so the server render is the same
 * shell for every visitor. An empty list here makes each venue's page render
 * once on its first scan and come from the CDN after that, instead of
 * rendering on the server for every QR scan.
 */
export function generateStaticParams() {
  return [];
}

export default function CloakroomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
