import { DeleteButton } from "@/components/delete-button";
import { deleteEssay } from "@/modules/mind/actions";
import { EssayEditor } from "@/modules/mind/components/essay-editor";
import { getEssay } from "@/modules/mind/queries";

export default async function EssayPage(props: PageProps<"/mind/[id]">) {
  const { id } = await props.params;
  // Non-UUID ids would make Postgres raise; treat them as missing.
  const essay = await getEssay(/^[0-9a-f-]{36}$/i.test(id) ? id : "00000000-0000-0000-0000-000000000000");

  return (
    // Keyed so saving a different essay never reuses stale editor state.
    <EssayEditor
      key={essay.id}
      essay={essay}
      actions={<DeleteButton action={deleteEssay.bind(null, essay.id)} label="에세이 삭제" />}
    />
  );
}
