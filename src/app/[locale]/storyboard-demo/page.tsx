"use client";

import { useState } from "react";
import { StoryboardImages } from "@/components/business/storyboard-images";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SceneGroup } from "@/types";

// 模拟场景分组数据
const mockSceneGroups: SceneGroup[] = [
  {
    scene_id: "1-1",
    scene_title: "咸阳原血战",
    images: [
      {
        image_id: "1",
        title: "咸阳原血战",
        image_url: "/anduming.png",
        prompt: "古代写实动漫风格，anime style，咸阳原战场山坡，广阔战场护城河鲜血染红箭矢乱飞尸骸遍地远山夕阳血色，项羽站立山坡制高点，手持虎头盘龙戟朝天，表情凝重眺望战场",
        narration: "这个西楚霸王在咸阳原血战三天，眼看就要攻破秦军防线！",
        status: "completed",
        createdAt: "2024-01-01T00:00:00Z"
      },
      {
        image_id: "2",
        title: "义军冲锋",
        image_url: "/atian.png",
        prompt: "古代写实动漫风格，anime style，咸阳原战场山坡，广阔战场护城河鲜血染红箭矢乱飞尸骸遍地远山夕阳血色，项羽高举虎头盘龙戟指向天空，张口怒吼，表情激昂威武",
        narration: "他一声怒吼'伐无道、诛暴秦'，瞬间点燃了全军斗志！",
        status: "completed",
        createdAt: "2024-01-01T00:00:00Z"
      },
      {
        image_id: "3",
        title: "咸阳城头",
        image_url: "/amu.png",
        prompt: "古代写实动漫风格，anime style，咸阳城城头，高大城墙青砖建筑远山夕阳血色天空，嬴政站立城头最高处，双手负后，表情冷漠傲视天下",
        narration: "可下一秒，咸阳城头竟然出现了一个让所有人绝望的身影！",
        status: "generating",
        progress: 75,
        createdAt: "2024-01-01T00:00:00Z"
      }
    ]
  },
  {
    scene_id: "1-2",
    scene_title: "黑龙突袭",
    images: [
      {
        image_id: "4",
        title: "黑龙突袭",
        image_url: "/anduming.png",
        prompt: "古代写实动漫风格，anime style，咸阳原战场山坡，广阔战场护城河鲜血染红箭矢乱飞尸骸遍地远山夕阳血色，项羽站立山坡制高点，手持虎头盘龙戟朝天，表情凝重眺望战场",
        narration: "这个西楚霸王在咸阳原血战三天，眼看就要攻破秦军防线！",
        status: "completed",
        createdAt: "2024-01-01T00:00:00Z"
      },
      {
        image_id: "5",
        title: "义军败退",
        image_url: "",
        prompt: "古代写实动漫风格，anime style，咸阳原战场山坡，广阔战场护城河鲜血染红箭矢乱飞尸骸遍地远山夕阳血色，项羽紧握虎头盘龙戟，表情愤怒不甘望着溃败的战场",
        narration: "义军这才发现早就中了埋伏，在恐惧中节节败退！",
        status: "generating",
        progress: 30,
        createdAt: "2024-01-01T00:00:00Z"
      },
      {
        image_id: "6",
        title: "始皇帝挥手",
        image_url: "",
        prompt: "古代写实动漫风格，anime style，咸阳城城头，高大城墙青砖建筑远山夕阳血色天空，嬴政站立城头，右手向前一挥，嘴角带着胜券在握的冷笑",
        narration: "始皇帝嘴角冷笑一挥手，两侧山头瞬间涌出上万秦军！",
        status: "failed",
        createdAt: "2024-01-01T00:00:00Z"
      }
    ]
  }
];

export default function StoryboardDemoPage() {
  const [sceneGroups, setSceneGroups] = useState<SceneGroup[]>(mockSceneGroups);
  const [isLoading, setIsLoading] = useState(false);

  // 模拟重新生成图片
  const handleRegenerateImage = async (imageId: string, newPrompt: string) => {
    setIsLoading(true);
    
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSceneGroups(prev => prev.map(scene => ({
      ...scene,
      images: scene.images.map(img => 
        img.image_id === imageId 
          ? { 
              ...img, 
              prompt: newPrompt, 
              status: 'generating' as const,
              progress: 0
            }
          : img
      )
    })));

    // 模拟生成过程
    const interval = setInterval(() => {
      setSceneGroups(prev => prev.map(scene => ({
        ...scene,
        images: scene.images.map(img => {
          if (img.image_id === imageId && img.status === 'generating') {
            const newProgress = Math.min((img.progress || 0) + 20, 100);
            return {
              ...img,
              progress: newProgress,
              status: newProgress === 100 ? 'completed' as const : 'generating' as const,
              image_url: newProgress === 100 ? '/anduming.png' : img.image_url
            };
          }
          return img;
        })
      })));
    }, 500);

    // 清理定时器
    setTimeout(() => {
      clearInterval(interval);
      setIsLoading(false);
    }, 5000);
  };

  // 模拟更新旁白
  const handleUpdateNarration = async (imageId: string, newNarration: string) => {
    setSceneGroups(prev => prev.map(scene => ({
      ...scene,
      images: scene.images.map(img => 
        img.image_id === imageId 
          ? { ...img, narration: newNarration }
          : img
      )
    })));
  };

  // 重置演示数据
  const resetDemo = () => {
    setSceneGroups(mockSceneGroups);
  };

  // 完成操作
  const handleComplete = () => {
    console.log('完成分镜图生成，进入下一步');
    // 这里可以跳转到下一个页面或执行其他操作
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            AI生图结果展示 - 场景分组
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            按照场景分组展示分镜图，支持提示词编辑、旁白展示和重新生成功能
          </p>
        </div>

        {/* 控制面板 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">演示控制</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={resetDemo} variant="outline">
                重置演示数据
              </Button>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                当前状态: {isLoading ? '处理中...' : '就绪'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">功能说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div>• 图片按场景分组展示，每个场景包含多张分镜图</div>
            <div>• 点击图片可全屏预览</div>
            <div>• 点击"编辑"按钮可修改提示词和旁白</div>
            <div>• 修改提示词后点击"重新生成"可生成新图片</div>
            <div>• 旁白文本会覆盖显示在图片上</div>
            <div>• 支持生成中、完成、失败三种状态显示</div>
          </CardContent>
        </Card>

        {/* 主要组件 */}
        <StoryboardImages
          data={sceneGroups}
          onRegenerateImage={handleRegenerateImage}
          onUpdateNarration={handleUpdateNarration}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
