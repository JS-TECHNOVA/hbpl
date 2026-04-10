import { MetadataRoute } from "next";

const SITE_CONFIG = {
    url: "https://myhbpl.org",
    name: "HBPL",
    description: "Harpur Belahi Premier League - The Ultimate Cricket Experience in Harpur",
};

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: [
					"/api/",
					"/admin/",
					"/_next/",
					"/private/",
					"*.json",
                    "/user/",
                    "/staff/",
				],
				crawlDelay: 0,
			},
			// Specific rules for major search engines
			{
				userAgent: "Googlebot",
				allow: "/",
				disallow: ["/api/", "/admin/", "/private/", "/staff/"],
			},
			{
				userAgent: "Bingbot",
				allow: "/",
				disallow: ["/api/", "/admin/", "/private/", "/staff/"],
			},
		],
		sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
		host: SITE_CONFIG.url,
	};
}
