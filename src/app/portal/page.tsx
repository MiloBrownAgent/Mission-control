import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function PortalRootPage() {
  // Check session server-side — forward the cookie to the /api/portal/me route
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mc_portal_session');

  if (!sessionCookie) {
    redirect('/portal/login');
  }

  // Validate with the me endpoint
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/portal/me`,
      {
        headers: {
          Cookie: `mc_portal_session=${sessionCookie.value}`,
        },
        cache: 'no-store',
      }
    );

    if (res.ok) {
      redirect('/portal/files');
    }
  } catch {
    // fall through
  }

  redirect('/portal/login');
}
