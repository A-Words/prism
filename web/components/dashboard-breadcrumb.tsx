"use client"

import { usePathname } from "next/navigation"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// 路由到中文标签的映射
const routeLabels: Record<string, { section: string; page: string }> = {
    "/": { section: "概览", page: "仪表盘" },
    "/dashboard": { section: "概览", page: "仪表盘" },
    "/learning-path": { section: "概览", page: "学习路径" },
    "/assessment": { section: "概览", page: "测评中心" },
    "/assistant": { section: "智能能力", page: "虚拟导师" },
    "/notes": { section: "智能能力", page: "智能笔记" },
    "/emotion": { section: "智能能力", page: "情绪与专注" },
    "/health": { section: "智能能力", page: "健康管理" },
    "/settings": { section: "系统", page: "设置" },
}

export function DashboardBreadcrumb() {
    const pathname = usePathname()
    const route = routeLabels[pathname] ?? { section: "Prism", page: pathname.slice(1) || "首页" }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">
                        {route.section}
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                    <BreadcrumbPage>{route.page}</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    )
}
