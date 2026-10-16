import { permanentRedirect } from "next/navigation";

/* brand pages live at the flat /{brand} URL, like categories and products — keep old /brand/{brand} links working */
export default async function OldBrandUrl({ params }: PageProps<"/brand/[slug]">) {
  permanentRedirect(`/${(await params).slug}`);
}
