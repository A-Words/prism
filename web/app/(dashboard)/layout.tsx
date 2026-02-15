import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import { AppSidebar } from "@/components/sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/server"

function getUserName(user: User): string {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const candidates = [metadata.full_name, metadata.name, metadata.username]
    const fromMetadata = candidates.find((value) => typeof value === "string" && value.trim().length > 0)
    if (typeof fromMetadata === "string") {
        return fromMetadata
    }
    if (user.email) {
        return user.email.split("@")[0] || "学习者"
    }
    return "学习者"
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
        redirect("/login")
    }
    const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>
    const avatar = typeof metadata.avatar_url === "string" ? metadata.avatar_url : ""

    return (
        <SidebarProvider>
            <AppSidebar
                user={{
                    name: getUserName(data.user),
                    email: data.user.email ?? "",
                    avatar,
                }}
            />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="#">
                                        Building Your Application
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
