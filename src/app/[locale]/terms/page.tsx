'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function TermsOfServicePage() {
  const params = useParams()
  const locale = params?.locale as string
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-8">
          <Link href={`/${locale}/auth/login`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('login')}
          </Link>
        </Button>

        <Card className="border-none shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="text-3xl font-bold">{t('termsOfService')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 prose dark:prose-invert max-w-none">
            {locale === 'zh' ? (
              <div className="space-y-6">
                <section>
                  <h2 className="text-xl font-semibold">1. 接受条款</h2>
                  <p>通过访问或使用 Mira 平台，您同意受这些服务条款的约束。如果您不同意这些条款，请勿使用我们的服务。</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">2. 服务说明</h2>
                  <p>Mira 是一个基于 AI 的动画创作平台。我们保留根据业务需要修改、暂停或中断服务的权利，且无需承担责任。</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">3. 用户账户</h2>
                  <p>您必须对您的账户凭据保密，并对您的账户下发生的所有活动负责。您必须年满 13 周岁才能使用本服务。</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">4. 用户内容</h2>
                  <p>您保留对您上传至 Mira 的内容的所有权。但是，通过上传内容，您授予 Mira 一项全球性的、非排他性的、免版税的许可，允许我们仅为向您提供服务之目的使用、处理该内容。</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">5. 禁止行为</h2>
                  <p>您不得利用我们的服务从事任何非法活动，包括但不限于上传侵权内容、恶意攻击系统、或利用 AI 生成有害内容。</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">6. 免责声明</h2>
                  <p>服务按“原样”提供。Mira 不对 AI 生成内容的准确性、完整性或适用性作任何明示或暗示的保证。</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">7. 责任限制</h2>
                  <p>在法律允许的最大范围内，Mira 对因使用本服务而产生的任何间接、偶然、特殊或惩罚性损害不承担责任。</p>
                </section>
              </div>
            ) : (
              <div className="space-y-6">
                <section>
                  <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
                  <p>By accessing or using the Mira platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">2. Description of Service</h2>
                  <p>Mira is an AI-based animation creation platform. We reserve the right to modify, suspend, or discontinue the service based on business needs without liability.</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">3. User Accounts</h2>
                  <p>You must keep your account credentials confidential and are responsible for all activities that occur under your account. You must be at least 13 years old to use the service.</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">4. User Content</h2>
                  <p>You retain ownership of the content you upload to Mira. However, by uploading content, you grant Mira a worldwide, non-exclusive, royalty-free license to use and process that content solely for the purpose of providing services to you.</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">5. Prohibited Conduct</h2>
                  <p>You may not use our services for any illegal activities, including but not limited to uploading infringing content, maliciously attacking the system, or using AI to generate harmful content.</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">6. Disclaimer</h2>
                  <p>Services are provided "as is". Mira makes no express or implied warranties regarding the accuracy, completeness, or suitability of AI-generated content.</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">7. Limitation of Liability</h2>
                  <p>To the maximum extent permitted by law, Mira shall not be liable for any indirect, incidental, special, or punitive damages arising from the use of the service.</p>
                </section>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
