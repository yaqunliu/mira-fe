'use client'

import React, { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pointsApi } from '@/lib/api/points'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Coins, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
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

  // 查询积分统计
  const { data: statistics } = useQuery({
    queryKey: ['points', 'statistics'],
    queryFn: () => pointsApi.getStatistics(),
  })

  // 下拉刷新处理函数
  const handleRefresh = useCallback(async () => {
    // 重新获取所有积分相关数据
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['points', 'balance'] }),
      queryClient.invalidateQueries({ queryKey: ['points', 'records'] }),
      queryClient.invalidateQueries({ queryKey: ['points', 'statistics'] }),
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
        <div className="container mx-auto px-4 pt-4 pb-2 max-w-4xl">
          {/* 返回按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-2"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('back')}
          </Button>

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
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          {/* 积分余额卡片 */}
          <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('balance')}</CardTitle>
        </CardHeader>
        <CardContent>
          {balanceLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : balance ? (
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-600">
                  {balance.available_points}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('availablePoints')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('totalPoints')}: </span>
                  <span className="font-medium">{balance.total_points}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('todayConsumed')}: </span>
                  <span className="font-medium">{balance.today_consumed}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('monthConsumed')}: </span>
                  <span className="font-medium">{balance.month_consumed}</span>
                </div>
                {/* 显示临时积分（expires_at 不为 null 的积分） */}
                {balance.points_by_type.some(
                  (t) => t.expires_at !== null && t.expires_at !== undefined && t.points > 0
                ) && (
                  <div className="text-orange-600 dark:text-orange-400">
                    <span className="text-muted-foreground">{t('expiringSoon')}: </span>
                    <span className="font-medium">
                      {balance.points_by_type
                        .filter((t) => t.expires_at !== null && t.expires_at !== undefined)
                        .reduce((sum, t) => sum + t.points, 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
          </CardContent>
          </Card>

          {/* 统计信息 */}
          {statistics && (
            <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('statistics')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">{t('totalEarned')}</div>
                <div className="text-lg font-semibold text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {statistics.total_earned}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('totalConsumed')}</div>
                <div className="text-lg font-semibold text-red-600 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  {statistics.total_consumed}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('todayConsumed')}</div>
                <div className="text-lg font-semibold">{statistics.today_consumed}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('monthConsumed')}</div>
                <div className="text-lg font-semibold">{statistics.month_consumed}</div>
              </div>
            </div>
            </CardContent>
            </Card>
          )}

          {/* 筛选和记录列表 */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle>{t('records')}</CardTitle>
                </div>
                {/* 筛选 */}
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={recordType || '__all__'}
                    onValueChange={(value) => {
                      setRecordType((value === '__all__' ? '' : value) as RecordType | '')
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="h-8 flex-1 min-w-[120px]" size="sm">
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
                    <SelectTrigger className="h-8 flex-1 min-w-[120px]" size="sm">
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
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          <CardContent>
            {recordsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : recordsData && recordsData.items.length > 0 ? (
              <div className="space-y-4">
                {recordsData.items.map((record) => (
                  <div
                    key={record.record_id}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2 min-w-0">
                      {/* 操作名称和记录类型 - 允许换行 */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm sm:text-base">
                          {getOperationName(record.operation_type)}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs shrink-0 ${
                            record.points > 0 
                              ? 'border-green-500 text-green-700 dark:text-green-400' 
                              : 'border-red-500 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {getRecordTypeName(record.record_type)}
                        </Badge>
                        {record.expires_at && (
                          <Badge 
                            variant="outline" 
                            className="text-xs border-orange-500 text-orange-700 dark:text-orange-400 shrink-0"
                          >
                            {t('expiresAt')}: {formatDate(record.expires_at)}
                          </Badge>
                        )}
                      </div>
                      {record.description && (
                        <div className="text-sm text-muted-foreground break-words">
                          {record.description}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{formatDate(record.created_at)}</span>
                        </div>
                        {/* 显示临时积分标识（有 expires_at 的积分） */}
                        {(record.points_type === 'daily_checkin' || record.points_type === 'checkin' || record.expires_at) && (
                          <span className="text-orange-600 dark:text-orange-400">
                            {t('dailyCheckinPoints')}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* 积分显示 - 在移动端也显示在右侧 */}
                    <div className="flex sm:flex-col sm:text-right items-end sm:items-end justify-between sm:justify-start gap-2 sm:space-y-1 shrink-0">
                      <div
                        className={`text-lg font-semibold flex items-center gap-1 ${
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
                        {record.points > 0 ? '+' : ''}
                        {record.points}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('balanceAfter')}: {record.balance_after}
                      </div>
                    </div>
                  </div>
                ))}
                {/* 分页 */}
                {recordsData.total > pageSize && (
                  <div className="mt-6 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (page > 1) setPage(page - 1)
                            }}
                            className={page === 1 ? 'pointer-events-none opacity-50' : ''}
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
                                    <span className="px-2">...</span>
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
                            className={
                              page >= Math.ceil(recordsData.total / pageSize)
                                ? 'pointer-events-none opacity-50'
                                : ''
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('noRecords')}
              </div>
            )}
          </CardContent>
          </Card>
        </div>
      </PullToRefresh>
    </div>
  )
}

