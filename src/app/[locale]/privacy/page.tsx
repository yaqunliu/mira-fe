'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
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
            <CardTitle className="text-3xl font-bold">{t('privacyPolicy')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 prose dark:prose-invert max-w-none">
            {locale === 'zh' ? (
              <div className="space-y-6">
                <section>
                  <h2 className="text-xl font-semibold">1. 我们收集的信息</h2>
                  <p>我们收集您在注册和使用 Mira 平台时提供的信息，包括但不限于：您的电子邮箱地址、用户名、以及您上传的文本内容（如小说文案）。</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">2. 信息的使用方式</h2>
                  <p>我们使用收集的信息来提供、维护和改进我们的服务，包括：</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>创建和管理您的账户</li>
                    <li>处理您的 AI 动画创作请求</li>
                    <li>发送与服务相关的通知</li>
                    <li>防止欺诈和滥用</li>
                  </ul>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">3. 信息的共享</h2>
                  <p>我们不会将您的个人信息出售给第三方。我们仅在以下情况下共享您的信息：</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>经您同意</li>
                    <li>法律要求</li>
                    <li>为了提供服务（例如与云服务提供商合作）</li>
                  </ul>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">4. 数据安全</h2>
                  <p>我们采取合理的技术和组织措施来保护您的信息免受未经授权的访问、使用或披露。</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">5. 您的权利</h2>
                  <p>您有权访问、更正或删除您的个人信息。您可以通过账户设置或联系我们的支持团队来行使这些权利。</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">6. 政策更新</h2>
                  <p>我们可能会不时更新此隐私政策。重大变更时，我们会通过应用内通知或电子邮件告知您。</p>
                </section>
              </div>
            ) : (
              <div className="space-y-6">
                <section>
                  <h2 className="text-xl font-semibold">1. Information We Collect</h2>
                  <p>We collect information you provide when registering and using the Mira platform, including but not limited to: your email address, username, and the text content you upload (e.g., novel scripts).</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">2. How We Use Information</h2>
                  <p>We use the collected information to provide, maintain, and improve our services, including:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Creating and managing your account</li>
                    <li>Processing your AI animation creation requests</li>
                    <li>Sending service-related notifications</li>
                    <li>Preventing fraud and abuse</li>
                  </ul>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">3. Sharing of Information</h2>
                  <p>We do not sell your personal information to third parties. We only share your information in the following cases:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>With your consent</li>
                    <li>As required by law</li>
                    <li>To provide services (e.g., working with cloud service providers)</li>
                  </ul>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">4. Data Security</h2>
                  <p>We take reasonable technical and organizational measures to protect your information from unauthorized access, use, or disclosure.</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">5. Your Rights</h2>
                  <p>You have the right to access, correct, or delete your personal information. You can exercise these rights through account settings or by contacting our support team.</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">6. Policy Updates</h2>
                  <p>We may update this privacy policy from time to time. We will notify you of significant changes via in-app notifications or email.</p>
                </section>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
