import { redirect } from "next/navigation";

export default async function LocaleIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // 进入 /:locale 默认跳转到对应语言的 Home
  redirect(`/${locale}/home`);
}
