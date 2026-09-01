'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function TermsOfServicePage() {
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
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">{t('termsOfService')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-gray-800">1. Acceptance of Terms</h2>
                <p className="text-gray-600">By accessing or using the Mira platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-gray-800">2. Description of Service</h2>
                <p className="text-gray-600">Mira is an AI-based animation creation platform. We reserve the right to modify, suspend, or discontinue the service based on business needs without liability.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-gray-800">3. User Accounts</h2>
                <p className="text-gray-600">You must keep your account credentials confidential and are responsible for all activities that occur under your account. You must be at least 13 years old to use the service.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-gray-800">4. User Content</h2>
                <p className="text-gray-600">You retain ownership of the content you upload to Mira. However, by uploading content, you grant Mira a worldwide, non-exclusive, royalty-free license to use and process that content solely for the purpose of providing services to you.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-gray-800">5. Prohibited Conduct</h2>
                <p className="text-gray-600">You may not use our services for any illegal activities, including but not limited to uploading infringing content, maliciously attacking the system, or using AI to generate harmful content.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-gray-800">6. Disclaimer</h2>
                <p className="text-gray-600">Services are provided "as is". Mira makes no express or implied warranties regarding the accuracy, completeness, or suitability of AI-generated content.</p>
              </section>
              <section>
                <h2 className="text-xl font-semibold text-gray-800">7. Limitation of Liability</h2>
                <p className="text-gray-600">To the maximum extent permitted by law, Mira shall not be liable for any indirect, incidental, special, or punitive damages arising from the use of the service.</p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
