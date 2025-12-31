"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function NovelsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;

  useEffect(() => {
    router.replace(`/${locale}/scripts`);
  }, [locale, router]);

  return null;
}
