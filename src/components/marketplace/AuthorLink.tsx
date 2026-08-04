import { useNavigate } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";

export function AuthorLink({ handle, verified }: { handle: string; verified?: boolean }) {
  const navigate = useNavigate();
  const slug = handle.replace(/^@/, "");
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate({ to: "/u/$handle", params: { handle: slug } });
      }}
      className="inline-flex items-center font-medium text-muted-foreground hover:text-primary hover:underline"
    >
      {handle}
      {verified && (
        <span className="ml-1 inline-flex text-primary">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Verified author</span>
        </span>
      )}
    </button>
  );
}
