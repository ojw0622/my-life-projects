import { EssayEditor } from "@/modules/mind/components/essay-editor";

export const metadata = { title: "새 글 · My Life Dashboard" };

export default function NewEssayPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">새 글</h1>
      <EssayEditor />
    </>
  );
}
