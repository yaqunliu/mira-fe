import { redirect } from "next/navigation";

export default function LocaleIndexPage() {
  // 访问 / 时跳转到 Home。URL 不带语言前缀（localePrefix: 'never'）。
  redirect('/home');
}
