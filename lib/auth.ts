import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  sendAddedToGroupEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email";
import { claimUnclaimedMemberships } from "@/lib/members/claim";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Links any group memberships this person was added to by email
        // before they had an account — including ones added long before
        // this feature shipped, since claimUnclaimedMemberships looks at
        // every unclaimed Member row, not just recent ones.
        after: async (user) => {
          const claimed = await claimUnclaimedMemberships(prisma, user);
          for (const group of claimed) {
            await sendAddedToGroupEmail(user.email, {
              groupName: group.groupName,
              groupId: group.groupId,
              inviterName: null,
            }).catch((err) =>
              console.error("Failed to send added-to-group email", err),
            );
          }
        },
      },
    },
  },
  plugins: [nextCookies()], // must stay last
});

export const getCachedSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireAuth() {
  const session = await getCachedSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}
