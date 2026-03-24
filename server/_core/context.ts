import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { createClient } from "@supabase/supabase-js";
import { getUserByOpenId, upsertUser } from "../db";

let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Backend Supabase env vars missing. Using placeholders.");
    }
    supabaseClient = createClient(
      supabaseUrl || "https://placeholder.supabase.co", 
      supabaseAnonKey || "placeholder"
    );
  }
  return supabaseClient;
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  estabelecimentoId?: number;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authHeader = opts.req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const sup = getSupabase();
      const { data, error } = await sup.auth.getUser(token);
      
      if (error) {
        console.error("[TRPC Context] Supabase token validation error:", error.message);
      }
      
      if (!error && data?.user) {
        const supabaseUser = data.user;
        
        await upsertUser({
          openId: supabaseUser.id,
          email: supabaseUser.email ?? null,
          name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? null,
          loginMethod: supabaseUser.app_metadata?.provider ?? "supabase",
        });

        user = await getUserByOpenId(supabaseUser.id) ?? null;
      }
    }
  } catch (error) {
    console.error("[TRPC Context] Failed to authenticate Supabase token:", error);
  }

  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    estabelecimentoId: (user as any)?.estabelecimentoId,
  };
}
