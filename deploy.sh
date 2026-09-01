#!/usr/bin/env bash
#
# Mira 前端部署脚本（Docker）
#
# 用法：
#   git pull origin master && ./deploy.sh     ← 标准用法
#
#   ./deploy.sh                # 校验 → 停 worker → 构建 → 启动 → 恢复 worker → 验证
#   ./deploy.sh --no-build     # 跳过构建，只重启容器（仅在没改代码/没改 .env 时有意义）
#   ./deploy.sh --keep-worker  # 不停 celery worker（内存充足或后端在别的机器上）
#
# ⚠️ 本脚本不拉代码，git pull 由你显式执行。原因：
#    bash 是边读边执行的，脚本内部的 git pull 若更新了 deploy.sh 自身，
#    正在运行的 shell 会读到新旧混杂的内容，可能中途报语法错误或静默跳步。
#
# ⚠️ 前端没有 bind mount（对比后端的 ./:/app），代码在镜像里、next build 在
#    镜像构建阶段执行。所以改了任何前端代码或 .env，都必须重新构建 —— 光
#    restart 完全无效。这也是本脚本默认带 --build 的原因。
#
# 幂等：可重复执行。

set -euo pipefail

cd "$(dirname "$0")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()      { echo -e "${GREEN}[ OK ]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()     { echo -e "${RED}[FAIL]${NC} $1"; }
section() { echo; echo "=========================================="; echo " $1"; echo "=========================================="; }

DO_BUILD=1; KEEP_WORKER=0
for arg in "$@"; do
  case "$arg" in
    --no-build)    DO_BUILD=0 ;;
    --keep-worker) KEEP_WORKER=1 ;;
    -h|--help)     sed -n '2,21p' "$0"; exit 0 ;;
    *) err "未知参数: $arg"; exit 1 ;;
  esac
done

SHARED_NET="mira-net"

# 后端目录 —— 需要它来停/恢复 celery worker 腾内存。
# 优先取环境变量，其次同级目录，最后按服务器上的实际路径兜底。
if [ -n "${BACKEND_DIR:-}" ]; then
  :
elif [ -d ../mira-service ]; then
  BACKEND_DIR="$(cd ../mira-service && pwd)"
else
  BACKEND_DIR="/opt/mira-service"
fi

# ------------------------------------------------------------
# 1. 环境检查
# ------------------------------------------------------------
section "1/6 环境检查"

command -v docker >/dev/null 2>&1 || { err "未安装 docker"; exit 1; }
docker compose version >/dev/null 2>&1 || {
  err "docker compose (v2) 不可用。本脚本不支持 v1 的 docker-compose 独立二进制。"
  exit 1
}
docker info >/dev/null 2>&1 || { err "Docker daemon 未运行"; exit 1; }
ok "docker $(docker --version | awk '{print $3}' | tr -d ,) / compose $(docker compose version --short)"

# ------------------------------------------------------------
# 2. .env 校验
#
# 文件名必须是 .env（compose 的默认插值文件），这样所有 docker compose
# 子命令都不用带 --env-file。早期叫 .env.docker，漏参数时会报
# 「required variable NEXT_PUBLIC_SUPABASE_URL is missing a value」。
# ------------------------------------------------------------
section "2/6 校验 .env"

[ -f .env ] || { err ".env 不存在。请执行: cp .env.example .env 然后填写"; exit 1; }

getenv() { grep -E "^${1}=" .env | tail -1 | cut -d= -f2- | sed 's/[[:space:]]*$//'; }

FATAL=0

# 2.1 两个 Supabase 值必填 —— compose 里是 :? 形式，缺失时构建直接失败，
#     但在这里提前拦住能给出更有用的提示
for k in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; do
  if [ -z "$(getenv "$k")" ]; then
    err "$k 为空（必填）。从 Supabase 控制台 → Project Settings → API 获取"
    FATAL=1
  fi
done

# 2.2 Project URL 不能带路径后缀（抄成 Data API 地址是最常见的错法）
SB_URL="$(getenv NEXT_PUBLIC_SUPABASE_URL)"
if echo "$SB_URL" | grep -qE '/(rest|auth|storage|realtime)/v[0-9]'; then
  err "NEXT_PUBLIC_SUPABASE_URL 带了路径后缀: $SB_URL"
  err "  应填 Project URL，形如 https://xxxxxxxx.supabase.co（不带任何路径）"
  FATAL=1
fi

# 2.3 必须与后端同一个 Supabase 项目，否则前端签发的 token 后端验不过，
#     表现为「能登录，但登录后所有接口 401」—— 这种现象很容易误判成后端故障
if [ -f "$BACKEND_DIR/.env" ]; then
  BE_URL="$(grep -E '^SUPABASE_URL=' "$BACKEND_DIR/.env" | tail -1 | cut -d= -f2- | sed 's#/*$##')"
  FE_URL="$(echo "$SB_URL" | sed 's#/*$##')"
  if [ -n "$BE_URL" ] && [ "$BE_URL" != "$FE_URL" ]; then
    err "Supabase 项目与后端不一致："
    err "  前端 $FE_URL"
    err "  后端 $BE_URL"
    err "  两边必须是同一个项目，否则登录后接口一律 401。"
    FATAL=1
  else
    ok "Supabase 项目与后端一致"
  fi
else
  warn "未找到 $BACKEND_DIR/.env，跳过与后端的一致性核对"
fi

[ "$FATAL" -eq 0 ] || { echo; err "配置校验未通过，已中止。"; exit 1; }
ok ".env 校验通过"

PORT="$(getenv PORT)"; PORT="${PORT:-8001}"

# ------------------------------------------------------------
# 3. 共享网络 + 代码版本
# ------------------------------------------------------------
section "3/6 共享网络与代码版本"

if docker network inspect "$SHARED_NET" >/dev/null 2>&1; then
  ok "网络 $SHARED_NET 已存在"
else
  # 前端通过该网络以 http://mira-api:8100 访问后端；不存在则容器起不来
  docker network create "$SHARED_NET" >/dev/null
  ok "已创建网络 $SHARED_NET"
fi

if [ -d .git ]; then
  info "分支    : $(git rev-parse --abbrev-ref HEAD)"
  info "commit  : $(git log -1 --pretty='%h %s')"
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    warn "工作区有未提交改动 —— 构建出的镜像与仓库内容不一致"
  else
    ok "工作区干净"
  fi
fi

# ------------------------------------------------------------
# 4. 腾内存：停掉后端 celery worker
#
# next build 峰值约 2GB，而 celery worker（concurrency=2）常驻 0.8-1.2GB。
# 2C4G 机器上不停 worker，构建大概率被 OOM killer 打断 —— 而它通常先杀最大的
# 进程，现象是「构建莫名失败」或「worker 悄悄消失」，都不指向真正的原因。
#
# 恢复动作挂在 trap EXIT 上：构建失败退出时 worker 也必须恢复，否则你在排查
# 构建问题的同时，后端任务正在静默地不执行 —— 会被误判成两个不相干的故障。
# ------------------------------------------------------------
section "4/6 内存与 worker"

WORKER_WAS_UP=0

restore_worker() {
  if [ "$WORKER_WAS_UP" -eq 1 ]; then
    echo
    info "恢复 celery worker..."
    if (cd "$BACKEND_DIR" && docker compose start celery_worker >/dev/null 2>&1); then
      ok "celery worker 已恢复"
    else
      err "celery worker 恢复失败！请手动执行："
      err "  cd $BACKEND_DIR && docker compose start celery_worker"
    fi
  fi
}
trap restore_worker EXIT

if command -v free >/dev/null 2>&1; then
  info "当前内存：$(free -h | awk '/^Mem:/{print "总 "$2"  已用 "$3"  可用 "$7}')"
  info "Swap    ：$(free -h | awk '/^Swap:/{print $2}')"
fi

if [ "$KEEP_WORKER" -eq 1 ]; then
  info "--keep-worker：不停 celery worker"
elif [ ! -d "$BACKEND_DIR" ]; then
  warn "后端目录不存在（$BACKEND_DIR），跳过 worker 处理"
  warn "  如后端在别的路径，用 BACKEND_DIR=/path ./deploy.sh"
else
  WSTATE="$( (cd "$BACKEND_DIR" && docker compose ps celery_worker --format '{{.State}}' 2>/dev/null) || true )"
  case "$WSTATE" in
    *running*)
      WORKER_WAS_UP=1
      info "停掉 celery worker 腾内存（构建结束后自动恢复）..."
      (cd "$BACKEND_DIR" && docker compose stop celery_worker >/dev/null)
      ok "celery worker 已停止"
      ;;
    *)
      info "celery worker 未在运行，无需处理（结束后也不会擅自启动它）"
      ;;
  esac
fi

if command -v free >/dev/null 2>&1 && [ "$DO_BUILD" -eq 1 ]; then
  AVAIL=$(free -m | awk '/^Mem:/{print $7}')
  if [ "$AVAIL" -lt 1500 ]; then
    warn "可用内存仅 ${AVAIL}MB，next build 峰值约 2GB —— 可能 OOM。"
    warn "  构建失败时先查：dmesg -T | grep -i 'killed process'"
  else
    ok "可用内存 ${AVAIL}MB"
  fi
fi

# ------------------------------------------------------------
# 5. 构建与启动
# ------------------------------------------------------------
section "5/6 构建与启动"

if [ "$DO_BUILD" -eq 1 ]; then
  info "构建并启动（首次约 5-15 分钟：pnpm install + next build）..."
  docker compose up -d --build
else
  warn "--no-build：跳过构建。注意 NEXT_PUBLIC_* / BACKEND_URL 都是构建时固化的，"
  warn "  改了 .env 却不构建的话，新值不会生效。"
  docker compose up -d
fi
ok "容器已启动"

# ------------------------------------------------------------
# 6. 验证
# ------------------------------------------------------------
section "6/6 验证"

docker compose ps

# 6.1 等容器进入 running
READY=0
for _ in $(seq 1 30); do
  STATE="$(docker compose ps mira-fe --format '{{.State}}' 2>/dev/null || true)"
  case "$STATE" in *running*) READY=1; break ;; esac
  sleep 2
done
if [ "$READY" -ne 1 ]; then
  err "mira-fe 未进入 running。最近日志："
  docker compose logs --tail=40 mira-fe
  exit 1
fi
ok "mira-fe 正在运行"

# 6.2 BACKEND_URL 是否固化进产物
#     output: 'standalone' 的产物里没有 next.config.js，配置分散在几个文件中，
#     所以用 node 一次查全（镜像是 node:20-alpine，node 一定在）
FIXED="$(docker compose exec -T mira-fe node -e "
const fs=require('fs');
const files=['server.js','.next/routes-manifest.json','.next/required-server-files.json'];
const hits=files.filter(p=>{try{return fs.readFileSync(p,'utf8').includes('mira-api:8100')}catch(e){return false}});
process.stdout.write(hits.join(','));
" 2>/dev/null || true)"
if [ -n "$FIXED" ]; then
  ok "BACKEND_URL 已固化进产物（$FIXED）"
else
  warn "产物中未找到 mira-api:8100 —— rewrites 可能没生效"
  warn "  检查 docker-compose.yml 的 build args 是否传了 BACKEND_URL"
fi

# 6.3 前端容器 → 后端容器（走 mira-net 别名）
BE_HEALTH="$(docker compose exec -T mira-fe node -e "
fetch('http://mira-api:8100/health').then(r=>r.text()).then(t=>process.stdout.write(t)).catch(e=>process.stdout.write('ERR '+e.message));
" 2>/dev/null || true)"
case "$BE_HEALTH" in
  *healthy*) ok "前端 → 后端连通（mira-api:8100/health）" ;;
  *) warn "前端访问后端失败：${BE_HEALTH:-无响应}"
     warn "  确认后端 api 容器在跑，且两个容器都在 $SHARED_NET 上："
     warn "    docker network inspect $SHARED_NET --format '{{range .Containers}}{{.Name}} {{end}}'" ;;
esac

# 6.4 同源代理是否生效
#     关键在 content-type：两种情况 HTTP 状态码都是 404，
#     只有 content-type 能区分请求到底有没有出前端容器。
#       application/json → 后端 FastAPI 返回的 404，代理生效
#       text/html        → Next 自己的 404 页面，rewrites 没生效
if command -v curl >/dev/null 2>&1; then
  CT="$(curl -s -o /dev/null -w '%{content_type}' --max-time 10 \
        "http://localhost:${PORT}/api/v1/__deploy_probe" || true)"
  case "$CT" in
    application/json*) ok "同源代理生效（/api/v1/* 已转发到 FastAPI）" ;;
    text/html*)        warn "/api/v1/* 返回 HTML —— rewrites 未生效，请求没出前端容器" ;;
    *)                 warn "探测 /api/v1/* 得到 content-type: ${CT:-空}" ;;
  esac

  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://localhost:${PORT}" || echo 000)"
  case "$CODE" in
    2*|3*) ok "前端入口正常（HTTP $CODE）" ;;
    *)     warn "前端入口返回 HTTP $CODE" ;;
  esac
fi

echo
ok "前端部署完成"
echo
info "访问地址：http://<服务器IP>:${PORT}"
info "查看日志：docker compose logs -f mira-fe"
info "内存占用：docker stats --no-stream"
echo
info "改了前端代码或 .env 之后，重新部署："
info "  git pull origin master && ./deploy.sh"
