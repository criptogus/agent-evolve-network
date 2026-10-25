import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { collectionFollowState, manageCollection } from "@/lib/collections/collections.functions";
export function FollowCollection({ id }: { id: string }) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const get = useServerFn(collectionFollowState);
  const set = useServerFn(manageCollection);
  const key = ["collection-follow", id, user?.id];
  const state = useQuery({ queryKey: key, queryFn: () => get({ data: { id } }), enabled: !!user });
  const change = useMutation({
    mutationFn: () => set({ data: { action: "follow", id, follow: !state.data } }),
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
  });
  if (!user) return <Link to="/login">Sign in to follow this collection</Link>;
  return (
    <div>
      <Button
        disabled={state.isPending || state.isError || change.isPending}
        onClick={() => change.mutate()}
      >
        {state.data ? "Unfollow collection" : "Follow collection"}
      </Button>
      {(state.isError || change.isError) && <p role="alert">Follow status could not be updated.</p>}
    </div>
  );
}
