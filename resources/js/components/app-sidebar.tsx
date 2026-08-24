import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import {
    BookOpen,
    FolderGit2,
    ImagePlus,
    Images,
    LayoutGrid,
    Shield,
    Film,
} from 'lucide-react';
import AdminPromptController from '@/actions/App/Http/Controllers/AdminPromptController';
import ImageToPromptController from '@/actions/App/Http/Controllers/ImageToPromptController';
import PromptController from '@/actions/App/Http/Controllers/PromptController';
import VideoAnalysisController from '@/actions/App/Http/Controllers/VideoAnalysisController';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem, User } from '@/types';

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { auth } = usePage<{ auth: { user: User | null } }>().props;
    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: 'Prompt Library',
            href: PromptController.index(),
            icon: Images,
        },
        {
            title: 'Image to Prompt',
            href: ImageToPromptController.index(),
            icon: ImagePlus,
        },
        {
            title: 'Video to Prompt',
            href: VideoAnalysisController.index(),
            icon: Film,
        },
        ...(auth.user?.is_admin
            ? [
                  {
                      title: 'Admin Dashboard',
                      href: AdminPromptController.index(),
                      icon: Shield,
                  },
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
