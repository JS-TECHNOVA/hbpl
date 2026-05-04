import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "http",
				hostname: "localhost",
				port: "8000",
				pathname: "/**",
			},
			{ protocol: "https", hostname: "myhbpl.org", pathname: "/**" },

			{ protocol: "https", hostname: "www.myhbpl.org", pathname: "/**" },
		],
	},
	experimental: { serverActions: { bodySizeLimit: "10mb" } },
};


export default nextConfig;
