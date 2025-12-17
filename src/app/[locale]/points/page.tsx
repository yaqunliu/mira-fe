'use client'

import React, { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pointsApi } from '@/lib/api/points'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { Coins, TrendingUp, TrendingDown, Calendar, Sparkles, Award, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { CheckinButton } from '@/components/business/checkin-button'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import type { RecordType, OperationType } from '@/types/points'

export default function PointsPage() {
  const t = useTranslations('points')
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) || 'zh'
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [recordType, setRecordType] = useState<RecordType | ''>('')
  const [operationType, setOperationType] = useState<OperationType | ''>('')
  const pageSize = 20

  // 查询积分余额（先获取，因为获取时会处理积分过期，可能添加过期记录）
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['points', 'balance'],
    queryFn: () => pointsApi.getBalance(),
  })

  // 查询积分记录（在 balance 获取完成后再获取，确保能获取到过期记录）
  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['points', 'records', page, recordType, operationType],
    queryFn: () =>
      pointsApi.getRecords({
        page,
        page_size: pageSize,
        record_type: recordType || undefined,
        operation_type: operationType || undefined,
      }),
    // 只有在 balance 加载完成后才获取 records
    enabled: !balanceLoading && !!balance,
  })

  // 下拉刷新处理函数
  const handleRefresh = useCallback(async () => {
    // 重新获取所有积分相关数据
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['points', 'balance'] }),
      queryClient.invalidateQueries({ queryKey: ['points', 'records'] }),
    ])
  }, [queryClient])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  const getOperationName = (operationType: string | null): string => {
    if (!operationType) return t('unknown')
    return t(`operation.${operationType}`) || operationType
  }

  const getRecordTypeName = (recordType: string): string => {
    return t(`recordType.${recordType}`) || recordType
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 固定头部区域 */}
      <div className="flex-shrink-0">
        <div className="container mx-auto px-4 pt-4 pb-2 max-w-4xl landscape-wide">
          {/* 页面标题 */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="h-6 w-6 text-amber-600" />
              {t('title')}
            </h1>
            <CheckinButton />
          </div>
        </div>
        <div className="h-[1px] w-full divider-primary" />
      </div>

      {/* 可滚动内容区域 - 支持下拉刷新 */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="container mx-auto px-4 py-2 max-w-4xl landscape-wide">
          {/* 积分余额卡片 - 现代化设计 */}
          <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 dark:from-amber-600 dark:via-amber-700 dark:to-orange-700 p-[1px] shadow-2xl shadow-amber-500/20 transition-all duration-300 hover:shadow-amber-500/30 hover:scale-[1.02]">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-6">
              {/* 装饰性背景元素 */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/10 dark:bg-amber-400/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-400/10 dark:bg-orange-400/5 rounded-full blur-3xl" />

              <div className="relative z-10">
                {balanceLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-40 bg-amber-200/50 dark:bg-amber-800/30" />
                    <Skeleton className="h-4 w-60 bg-amber-200/50 dark:bg-amber-800/30" />
                  </div>
                ) : balance ? (
                  <div className="space-y-6">
                    {/* 主要余额显示 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <Sparkles className="h-5 w-5" />
                        <span className="text-sm font-medium">{t('availablePoints')}</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-5xl font-bold bg-gradient-to-br from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent animate-in fade-in duration-500">
                          {balance.available_points}
                        </span>
                        <Coins className="h-8 w-8 text-amber-500 dark:text-amber-400 animate-pulse" />
                      </div>
                    </div>

                    {/* 详细信息网格 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-3 border border-amber-200/50 dark:border-amber-700/30 transition-all duration-200 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:scale-105">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">{t('totalPoints')}</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{balance.total_points}</span>
                      </div>

                      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-3 border border-blue-200/50 dark:border-blue-700/30 transition-all duration-200 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:scale-105">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">{t('todayConsumed')}</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{balance.today_consumed}</span>
                      </div>

                      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-3 border border-purple-200/50 dark:border-purple-700/30 transition-all duration-200 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:scale-105">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">{t('monthConsumed')}</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{balance.month_consumed}</span>
                      </div>

                      {/* 显示临时积分（expires_at 不为 null 的积分） */}
                      {balance.points_by_type.some(
                        (t) => t.expires_at !== null && t.expires_at !== undefined && t.points > 0
                      ) && (
                        <div className="bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/40 dark:to-red-900/40 backdrop-blur-sm rounded-xl p-3 border border-orange-300/50 dark:border-orange-600/30 transition-all duration-200 hover:scale-105 animate-pulse">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">{t('expiringSoon')}</span>
                          </div>
                          <span className="text-lg font-bold text-orange-700 dark:text-orange-300">
                            {balance.points_by_type
                              .filter((t) => t.expires_at !== null && t.expires_at !== undefined)
                              .reduce((sum, t) => sum + t.points, 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>


          {/* 筛选和记录列表 - 现代化设计 */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                {t('records')}
              </h2>
              {/* 筛选 */}
              <div className="flex flex-wrap gap-2">
                <Select
                  value={recordType || '__all__'}
                  onValueChange={(value) => {
                    setRecordType((value === '__all__' ? '' : value) as RecordType | '')
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-10 flex-1 min-w-[140px] rounded-xl border-2 transition-all duration-200 hover:border-amber-400 focus:border-amber-500" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('allRecordTypes')}</SelectItem>
                    <SelectItem value="consume">{t('recordType.consume')}</SelectItem>
                    <SelectItem value="reward">{t('recordType.reward')}</SelectItem>
                    <SelectItem value="checkin">{t('recordType.checkin')}</SelectItem>
                    <SelectItem value="expire">{t('recordType.expire')}</SelectItem>
                    <SelectItem value="recharge">{t('recordType.recharge')}</SelectItem>
                    <SelectItem value="refund">{t('recordType.refund')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={operationType || '__all__'}
                  onValueChange={(value) => {
                    setOperationType((value === '__all__' ? '' : value) as OperationType | '')
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-10 flex-1 min-w-[140px] rounded-xl border-2 transition-all duration-200 hover:border-amber-400 focus:border-amber-500" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('allOperations')}</SelectItem>
                    <SelectItem value="create_creation">{t('operation.create_creation')}</SelectItem>
                    <SelectItem value="generate_character">{t('operation.generate_character')}</SelectItem>
                    <SelectItem value="generate_shot">{t('operation.generate_shot')}</SelectItem>
                    <SelectItem value="generate_audio">{t('operation.generate_audio')}</SelectItem>
                    <SelectItem value="generate_video">{t('operation.generate_video')}</SelectItem>
                    <SelectItem value="upload_novel">{t('operation.upload_novel')}</SelectItem>
                    <SelectItem value="daily_checkin">{t('operation.daily_checkin')}</SelectItem>
                    <SelectItem value="register">{t('operation.register')}</SelectItem>
                    <SelectItem value="llm_call">{t('operation.llm_call')}</SelectItem>
                    <SelectItem value="temporary_points_expire">{t('operation.temporary_points_expire')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {recordsLoading ? (
              <div className="space-y-3 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : recordsData && recordsData.items.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  {recordsData.items.map((record, index) => (
                    <div
                      key={record.record_id}
                      className="group relative overflow-hidden rounded-xl border-2 border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 p-4 transition-all duration-300 hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-500/10 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4 flex flex-col"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* 装饰性渐变边框效果 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative z-10 flex flex-col gap-3 flex-1">
                        <div className="flex-1 space-y-2 min-w-0">
                          {/* 操作名称和记录类型 */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                              {getOperationName(record.operation_type)}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 border-2 font-medium ${
                                record.points > 0
                                  ? 'border-green-500/50 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-500/30'
                                  : 'border-red-500/50 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:border-red-500/30'
                              }`}
                            >
                              {getRecordTypeName(record.record_type)}
                            </Badge>
                            {record.expires_at && (
                              <Badge
                                variant="outline"
                                className="text-xs border-2 border-orange-500/50 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-500/30 shrink-0 animate-pulse"
                              >
                                {t('expiresAt')}: {formatDate(record.expires_at)}
                              </Badge>
                            )}
                          </div>
                          {record.description && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 break-words leading-relaxed line-clamp-2">
                              {record.description}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span className="truncate">{formatDate(record.created_at)}</span>
                            </div>
                            {/* 显示临时积分标识 */}
                            {(record.points_type === 'daily_checkin' || record.points_type === 'checkin' || record.expires_at) && (
                              <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded-lg">
                                <Sparkles className="h-3 w-3" />
                                <span>{t('dailyCheckinPoints')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* 积分显示 */}
                        <div className="flex flex-col items-start gap-2 shrink-0 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                          <div
                            className={`text-xl font-bold flex items-center gap-1 ${
                              record.points > 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {record.points > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span>
                              {record.points > 0 ? '+' : ''}
                              {record.points}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                            {t('balanceAfter')}: {record.balance_after}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* 分页 - 单独放在最底下一行 */}
                {recordsData.total > pageSize && (
                  <div className="mt-6 flex justify-center w-full">
                    <Pagination>
                      <PaginationContent className="gap-1">
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (page > 1) setPage(page - 1)
                            }}
                            className={`rounded-xl transition-all duration-200 ${
                              page === 1
                                ? 'pointer-events-none opacity-50'
                                : 'hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-400'
                            }`}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.ceil(recordsData.total / pageSize) }, (_, i) => i + 1)
                          .filter((p) => {
                            // 只显示当前页附近和首尾页
                            return (
                              p === 1 ||
                              p === Math.ceil(recordsData.total / pageSize) ||
                              Math.abs(p - page) <= 2
                            )
                          })
                          .map((p, idx, arr) => {
                            // 处理省略号
                            const prev = arr[idx - 1]
                            const showEllipsis = prev && p - prev > 1
                            return (
                              <React.Fragment key={p}>
                                {showEllipsis && (
                                  <PaginationItem>
                                    <span className="px-2 text-gray-400">...</span>
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setPage(p)
                                    }}
                                    isActive={p === page}
                                    className={`rounded-xl transition-all duration-200 ${
                                      p === page
                                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/30'
                                        : 'hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-400'
                                    }`}
                                  >
                                    {p}
                                  </PaginationLink>
                                </PaginationItem>
                              </React.Fragment>
                            )
                          })}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (page < Math.ceil(recordsData.total / pageSize))
                                setPage(page + 1)
                            }}
                            className={`rounded-xl transition-all duration-200 ${
                              page >= Math.ceil(recordsData.total / pageSize)
                                ? 'pointer-events-none opacity-50'
                                : 'hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-400'
                            }`}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 mt-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    {t('noRecords')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>
    </div>
  )
}

