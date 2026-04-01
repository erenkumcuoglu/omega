/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is stable in Next.js 16, no need for experimental flag
  turbopack: {
    root: __dirname,
  },
}

module.exports = nextConfig
