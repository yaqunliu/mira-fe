'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50/80 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="outline" asChild className="mb-8 border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm">
          <Link href={'/auth/login'}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('login')}
          </Link>
        </Button>

        <Card className="border-0 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">{t('privacyPolicy')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-gray-800">1. Information We Collect</h2>
                <p className="text-gray-600">We collect information you provide when registering and using the Mira platform, including but not limited to: your email address, username, and the text content you upload (e.g., novel scripts).</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-gray-800">2. How We Use Information</h2>
                <p className="text-gray-600">We use the collected information to provide, maintain, and improve our services, including:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>Creating and managing your account</li>
                  <li>Processing your AI animation creation requests</li>
                  <li>Sending service-related notifications</li>
                  <li>Preventing fraud and abuse</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-gray-800">3. Sharing of Information</h2>
                <p className="text-gray-600">We do not sell your personal information to third parties. We only share your information in the following cases:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>With your consent</li>
                  <li>As required by law</li>
                  <li>To provide services (e.g., working with cloud service providers)</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-gray-800">4. Data Security</h2>
                <p className="text-gray-600">We take reasonable technical and organizational measures to protect your information from unauthorized access, use, or disclosure.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-gray-800">5. Your Rights</h2>
                <p className="text-gray-600">You have the right to access, correct, or delete your personal information. You can exercise these rights through account settings or by contacting our support team.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-gray-800">6. Policy Updates</h2>
                <p className="text-gray-600">We may update this privacy policy from time to time. We will notify you of significant changes via in-app notifications or email.</p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
