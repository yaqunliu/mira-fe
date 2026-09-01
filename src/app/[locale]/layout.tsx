import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { AppSidebar } from '@/components/business/app-sidebar';
import { Toaster } from '@/components/ui/sonner';
import { SidebarWrapper } from '@/components/business/sidebar-wrapper';
import '../globals.css';

import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: {
    default: 'AI Animation Short Drama Creation Platform',
    template: '%s · AI Animation Short Drama',
  },
  description:
    'Transform novels into amazing animated short dramas using AI technology.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'AI Animation Short Drama Creation Platform',
    description:
      'Transform novels into amazing animated short dramas using AI technology.',
  },
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) notFound();

  const messages = await getMessages();
  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <NextIntlClientProvider locale={locale} messages={messages}>
                <TooltipProvider delayDuration={100}>
                  <SidebarWrapper>
                    {children}
                  </SidebarWrapper>
                  <Toaster position="top-right" visibleToasts={2} richColors closeButton />
                </TooltipProvider>
              </NextIntlClientProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}