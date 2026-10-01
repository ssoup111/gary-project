import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Testers (and real customers) land on these paths from guessing, old
  // bookmarks, or search results. Redirect the obvious guesses to the real
  // pages instead of 404ing on them.
  async redirects() {
    return [
      { source: "/packages", destination: "/pricing", permanent: false },
      { source: "/orders", destination: "/my-orders", permanent: false },
      { source: "/about", destination: "/how-it-works", permanent: false },
      { source: "/about-us", destination: "/how-it-works", permanent: false },
      { source: "/register", destination: "/signup", permanent: false },
      { source: "/create-account", destination: "/signup", permanent: false },
    ];
  },
};

export default nextConfig;
