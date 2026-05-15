import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import Database from "better-sqlite3";

const isProd = process.env.NODE_ENV === "production";

const instagramConfig =
  process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET
    ? [
        {
          providerId: "instagram" as const,
          clientId: process.env.INSTAGRAM_CLIENT_ID,
          clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
          authorizationUrl: "https://api.instagram.com/oauth/authorize",
          tokenUrl: "https://api.instagram.com/oauth/access_token",
          userInfoUrl:
            "https://graph.instagram.com/me?fields=id,username,account_type",
          scopes: ["user_profile"],
          pkce: false,
          mapProfileToUser: (profile: Record<string, unknown>) => ({
            id: String(profile.id),
            name: String(profile.username),
            email: `${String(profile.username)}@instagram.local`,
            image: null,
          }),
        },
      ]
    : [];

export const auth = betterAuth({
  database: new Database("./auth.db"),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  advanced: {
    cookiePrefix: "honestea",
    crossSubDomainCookies: {
      enabled: true,
      domain: isProd ? "honestai.app" : undefined,
    },
    useSecureCookies: isProd,
  },
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:8081",
    "https://honestai.app",
    "https://www.honestai.app",
    "https://api.honestai.app",
  ],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    },
  },
  plugins: [
    genericOAuth({
      config: instagramConfig,
    }),
  ],
});
