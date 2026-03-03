"use client";

import { useState } from "react";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Moon,
  Sun,
  Monitor,
  Mail,
  Lock,
  Smartphone,
  Languages,
  Volume2,
  HelpCircle,
  LogOut,
  Save
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weekly: false,
    aiMessages: true
  });
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("zh");
  const [volume, setVolume] = useState(80);

  const tabs = [
    { id: "profile", name: "个人资料", icon: User },
    { id: "notifications", name: "通知设置", icon: Bell },
    { id: "appearance", name: "外观主题", icon: Palette },
    { id: "language", name: "语言偏好", icon: Globe },
    { id: "security", name: "安全与隐私", icon: Shield },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">⚙️ 设置</h1>
        <p className="text-muted-foreground mt-2">管理你的账户和个性化偏好</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* 左侧导航 */}
        <div className="md:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.name}</span>
            </button>
          ))}
          
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors mt-8">
            <LogOut className="w-5 h-5" />
            <span>退出登录</span>
          </button>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 glass-card p-6">
          {/* 个人资料 */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                个人资料
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                    张
                  </div>
                  <button className="btn-secondary text-sm">
                    更换头像
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">用户名</label>
                    <input 
                      type="text" 
                      value="张三" 
                      className="glass-input w-full"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">邮箱</label>
                    <input 
                      type="email" 
                      value="zhangsan@example.com" 
                      className="glass-input w-full"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">手机号</label>
                    <input 
                      type="tel" 
                      value="138****8888" 
                      className="glass-input w-full"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">学校/单位</label>
                    <input 
                      type="text" 
                      value="某某大学" 
                      className="glass-input w-full"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">个人简介</label>
                  <textarea 
                    rows={3}
                    className="glass-input w-full"
                    placeholder="介绍一下自己..."
                  >热爱学习，喜欢探索新知识。</textarea>
                </div>

                <div className="flex justify-end">
                  <button className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    保存修改
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 通知设置 */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5" />
                通知设置
              </h2>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">邮件通知</p>
                      <p className="text-sm text-muted-foreground">接收学习报告和系统通知</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notifications.email}
                    onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                    className="toggle"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">推送通知</p>
                      <p className="text-sm text-muted-foreground">实时接收学习提醒</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notifications.push}
                    onChange={(e) => setNotifications({...notifications, push: e.target.checked})}
                    className="toggle"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">AI消息提醒</p>
                      <p className="text-sm text-muted-foreground">虚拟导师回复提醒</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notifications.aiMessages}
                    onChange={(e) => setNotifications({...notifications, aiMessages: e.target.checked})}
                    className="toggle"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">每周总结</p>
                      <p className="text-sm text-muted-foreground">每周学习报告邮件</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notifications.weekly}
                    onChange={(e) => setNotifications({...notifications, weekly: e.target.checked})}
                    className="toggle"
                  />
                </label>
              </div>
            </div>
          )}

          {/* 外观主题 */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Palette className="w-5 h-5" />
                外观主题
              </h2>
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">选择主题模式</p>
                
                <div className="grid grid-cols-3 gap-4">
                  <button 
                    onClick={() => setTheme("light")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === "light" 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Sun className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">浅色</span>
                  </button>
                  
                  <button 
                    onClick={() => setTheme("dark")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === "dark" 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Moon className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">深色</span>
                  </button>
                  
                  <button 
                    onClick={() => setTheme("system")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === "system" 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Monitor className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">跟随系统</span>
                  </button>
                </div>

                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-2">字体大小</p>
                  <input 
                    type="range" 
                    min="12" 
                    max="20" 
                    value="16" 
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 语言偏好 */}
          {activeTab === "language" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5" />
                语言偏好
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">界面语言</label>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="glass-input w-full"
                  >
                    <option value="zh">中文 (简体)</option>
                    <option value="en">English</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                  </select>
                </div>

                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    部分内容将根据你的语言偏好显示
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 安全与隐私 */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5" />
                安全与隐私
              </h2>
              
              <div className="space-y-4">
                <button className="btn-secondary w-full flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    修改密码
                  </span>
                  <span className="text-sm text-muted-foreground">••••••••</span>
                </button>

                <button className="btn-secondary w-full flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    双重验证
                  </span>
                  <span className="text-sm text-green-500">已开启</span>
                </button>

                <button className="btn-secondary w-full flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    登录设备管理
                  </span>
                  <span className="text-sm text-muted-foreground">3台设备</span>
                </button>

                <div className="mt-6 p-4 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-destructive mb-2">危险区域</p>
                  <button className="text-destructive hover:text-destructive/80 text-sm">
                    删除账户
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}