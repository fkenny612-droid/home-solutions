/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Truck Loads was briefly served at /freight
      { source: '/freight', destination: '/truck-loads', permanent: true },
    ];
  },
};

export default nextConfig;
