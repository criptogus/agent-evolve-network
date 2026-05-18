import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
        setSession(s);
        setUser(s?.user ?? null);
      });
      supabase.auth
        .getSession()
        .then(({ data }) => {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setLoading(false);
        })
        .catch(() => setLoading(false));
      return () => sub.subscription.unsubscribe();
    } catch {
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  }, []);

  return {
    session,
    user,
    loading,
    signOut: () => {
      try {
        return supabase.auth.signOut();
      } catch {
        setSession(null);
        setUser(null);
        return Promise.resolve({ error: null });
      }
    },
  };
}
