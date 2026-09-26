"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Icon button that confirms, then runs a bound delete Server Action. */
export function DeleteButton({
  action,
  label,
  confirmMessage = "삭제할까요? 되돌릴 수 없습니다.",
}: {
  action: () => Promise<void>;
  label: string;
  confirmMessage?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmMessage)) startTransition(() => action());
      }}
    >
      <Trash2Icon className="size-4" />
    </Button>
  );
}
