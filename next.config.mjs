/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Nobody may frame the app, so its buttons can't be clickjacked.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Keep visited pages in the client router cache for 30s so switching
    // back and forth between sections is instant instead of a fresh server
    // round trip every time. Any server action that changes data calls
    // revalidatePath, which clears this cache, so users never see their own
    // changes go stale.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
