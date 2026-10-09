/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
