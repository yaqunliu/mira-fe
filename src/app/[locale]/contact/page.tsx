'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Send,
  Sparkles,
} from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type ContactFormValues = {
  fullName: string
  email: string
  company: string
  role: string
  message: string
}

export default function ContactPage() {
  const t = useTranslations('contactPage')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ContactFormValues>({
    defaultValues: {
      fullName: '',
      email: '',
      company: '',
      role: '',
      message: '',
    },
    mode: 'onBlur',
  })

  const onSubmit = async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 800))
  }

  const handleReset = () => {
    reset()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDBCB4]/15 via-[#ADD8E6]/20 to-white text-gray-900">
      <header className="border-b border-white/80 bg-white/65 backdrop-blur-xl">
        <div className="container mx-auto flex min-h-20 items-center justify-between gap-4 px-4 py-4">
          <Link href="/home" className="group flex min-w-0 items-center gap-3">
            <Image
              src="/favicon.png"
              alt="Mira"
              width={44}
              height={44}
              className="rounded-xl object-contain shadow-md shadow-[#ADD8E6]/30 transition-opacity group-hover:opacity-80"
            />
            <div className="min-w-0">
              <p className="truncate text-xl font-bold text-gray-900">Mira</p>
              <p className="truncate text-xs text-gray-500">{t('brandTagline')}</p>
            </div>
          </Link>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/home">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('backHome')}</span>
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 lg:py-16">
        <section className="mb-10 max-w-3xl lg:mb-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#22C55E] shadow-[2px_2px_4px_rgba(173,221,230,0.3),-1px_-1px_3px_rgba(255,255,255,0.7)]">
            <Sparkles className="h-4 w-4" />
            {t('eyebrow')}
          </div>
          <h1 className="text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            {t('description')}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[#22C55E]" />
              {t('replyTime')}
            </span>
            <span className="inline-flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-[#22C55E]" />
              {t('languages')}
            </span>
          </div>
        </section>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
          <section className="rounded-2xl bg-white p-6 shadow-[8px_8px_18px_rgba(173,221,230,0.32),-6px_-6px_14px_rgba(255,255,255,0.85)] sm:p-8 lg:p-10">
            {isSubmitSuccessful ? (
              <div className="flex min-h-[500px] flex-col items-start justify-center py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#22C55E]/15 text-[#16A34A] shadow-[inset_2px_2px_5px_rgba(173,221,230,0.25),inset_-3px_-3px_8px_rgba(255,255,255,0.9)]">
                  <Check className="h-8 w-8" strokeWidth={2.5} />
                </div>
                <h2 className="mt-7 text-3xl font-bold text-gray-900">{t('successTitle')}</h2>
                <p className="mt-4 max-w-lg text-lg leading-8 text-gray-600">
                  {t('successDescription')}
                </p>
                <Button variant="outline" onClick={handleReset} className="mt-8">
                  {t('sendAnother')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <form noValidate onSubmit={handleSubmit(onSubmit)}>
                <div className="mb-8">
                  <p className="text-sm font-medium text-[#22C55E]">{t('formEyebrow')}</p>
                  <h2 className="mt-2 text-2xl font-bold text-gray-900">{t('formTitle')}</h2>
                </div>

                <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  <Field label={t('fullName')} error={errors.fullName?.message}>
                    <Input
                      autoComplete="name"
                      placeholder={t('fullNamePlaceholder')}
                      aria-invalid={Boolean(errors.fullName)}
                      {...register('fullName', {
                        required: t('requiredError'),
                        minLength: { value: 2, message: t('nameLengthError') },
                      })}
                    />
                  </Field>

                  <Field label={t('workEmail')} error={errors.email?.message}>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder={t('emailPlaceholder')}
                      aria-invalid={Boolean(errors.email)}
                      {...register('email', {
                        required: t('requiredError'),
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: t('emailError'),
                        },
                      })}
                    />
                  </Field>

                  <Field label={t('company')} error={errors.company?.message}>
                    <Input
                      autoComplete="organization"
                      placeholder={t('companyPlaceholder')}
                      aria-invalid={Boolean(errors.company)}
                      {...register('company', { required: t('requiredError') })}
                    />
                  </Field>

                  <Field label={t('role')} optional={t('optional')}>
                    <Input
                      autoComplete="organization-title"
                      placeholder={t('rolePlaceholder')}
                      {...register('role')}
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label={t('message')} error={errors.message?.message}>
                      <Textarea
                        rows={6}
                        placeholder={t('messagePlaceholder')}
                        aria-invalid={Boolean(errors.message)}
                        className="min-h-36 resize-y"
                        {...register('message', {
                          required: t('requiredError'),
                          minLength: { value: 10, message: t('messageLengthError') },
                        })}
                      />
                    </Field>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-4 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-md text-sm leading-6 text-gray-500">{t('privacyNote')}</p>
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isSubmitting ? t('sending') : t('submit')}
                  </Button>
                </div>
              </form>
            )}
          </section>

          <aside className="space-y-6 lg:sticky lg:top-8">
            <div className="rounded-2xl bg-white p-6 shadow-[6px_6px_14px_rgba(173,221,230,0.28),-4px_-4px_10px_rgba(255,255,255,0.8)] sm:p-8">
              <p className="text-sm font-medium text-[#22C55E]">{t('directEyebrow')}</p>
              <h2 className="mt-2 text-xl font-bold text-gray-900">{t('directTitle')}</h2>
              <dl className="mt-7 space-y-6">
                <ContactDetail icon={<Mail className="h-5 w-5" />} label={t('emailLabel')}>
                  <a className="break-all text-gray-900 hover:text-[#16A34A]" href="mailto:hello@mira.ai">
                    hello@mira.ai
                  </a>
                </ContactDetail>
                <ContactDetail icon={<MapPin className="h-5 w-5" />} label={t('officeLabel')}>
                  <span className="text-gray-900">{t('officeValue')}</span>
                </ContactDetail>
                <ContactDetail icon={<Globe2 className="h-5 w-5" />} label={t('teamLabel')}>
                  <span className="text-gray-900">{t('teamValue')}</span>
                </ContactDetail>
              </dl>
            </div>

            <div className="border-l-2 border-[#22C55E] px-5 py-2">
              <p className="text-sm font-semibold text-gray-900">{t('expectTitle')}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{t('expectDescription')}</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function Field({
  label,
  optional,
  error,
  children,
}: {
  label: string
  optional?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-baseline gap-2 text-sm font-semibold text-gray-800">
        {label}
        {optional ? <span className="font-normal text-gray-400">{optional}</span> : null}
      </span>
      {children}
      {error ? <span className="block text-sm text-red-600">{error}</span> : null}
    </label>
  )
}

function ContactDetail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4 border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ADD8E6]/25 text-[#16A34A]">
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase text-gray-400">{label}</dt>
        <dd className="mt-1 text-sm leading-6">{children}</dd>
      </div>
    </div>
  )
}
