import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { DeleteButton } from "@/components/delete-button";
import { deleteEssay } from "@/modules/mind/actions";
import { EssayEditor } from "@/modules/mind/components/essay-editor";
import { getEssay } from "@/modules/mind/queries";

export default async function EssayPage(props: PageProps<"/mind/[id]">) {
  const { id } = await props.params;
  // Non-UUID ids would make Postgres raise; treat them as missing.
  const essay = await getEssay(/^[0-9a-f-]{36}$/i.test(id) ? id : "00000000-0000-0000-0000-000000000000");

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <Link href="/mind" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
          <ArrowLeftIcon className="size-4" /> 목록
        </Link>
        <DeleteButton action={deleteEssay.bind(null, essay.id)} label="에세이 삭제" />
      </div>
      {/* Keyed so saving a different essay never reuses stale editor state. */}
      <EssayEditor key={essay.id} essay={essay} />
    </>
  );
}
