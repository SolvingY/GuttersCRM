export interface ShortcutDefinition {
  id: string;
  label: string;
  icon: string;
  route: string;
  group: string;
}

export const SHORTCUT_REGISTRY: ShortcutDefinition[] = [
  { id: 'scoreboard',       label: 'Scoreboard',        icon: 'LayoutDashboard',  route: '/admin/overview',          group: 'Overview'              },
  { id: 'leads',            label: 'Lead Management',   icon: 'FileText',         route: '/admin/leads',             group: 'Pipeline & Revenue'    },
  { id: 'lead_analytics',   label: 'Lead Analytics',    icon: 'TrendingUp',       route: '/admin/leadflow',          group: 'Pipeline & Revenue'    },
  { id: 'sales_perf',       label: 'Sales Performance', icon: 'BarChart2',        route: '/admin/sales-performance', group: 'Performance & Culture' },
  { id: 'leaderboards',     label: 'Leaderboards',      icon: 'BarChart3',        route: '/admin/leaderboards',      group: 'Performance & Culture' },
  { id: 'contests',         label: 'Competitions',      icon: 'Medal',            route: '/admin/contests',          group: 'Performance & Culture' },
  { id: 'pit_management',   label: 'Pit Management',    icon: 'Flame',            route: '/admin/pit',               group: 'Performance & Culture' },
  { id: 'company_goals',    label: 'Company Goals',     icon: 'Target',           route: '/admin/goals',             group: 'Performance & Culture' },
  { id: 'announcements',    label: 'Announcements',     icon: 'Megaphone',        route: '/admin/announcements',     group: 'Performance & Culture' },
  { id: 'contractor_mgmt',  label: 'Contractor Mgmt',   icon: 'Users',            route: '/admin/team',              group: 'Team Operations'       },
  { id: 'time_clock',       label: 'Time Clock',        icon: 'Clock',            route: '/admin/timeclock',         group: 'Team Operations'       },
  { id: 'future_teammates', label: 'Future Team Mates', icon: 'Briefcase',        route: '/admin/applicants',        group: 'Team Operations'       },
  { id: 'invite_users',     label: 'Invite Users',      icon: 'UserPlus',         route: '/admin/invites',           group: 'Team Operations'       },
  { id: 'user_roles',       label: 'User Roles',        icon: 'UserCog',          route: '/admin/users',             group: 'Team Operations'       },
  { id: 'weekly_updates',   label: 'Weekly Updates',    icon: 'Calendar',         route: '/admin/weekly',            group: 'Team Operations'       },
  { id: 'reports',          label: 'Reports',           icon: 'Bell',             route: '/admin/notifications',     group: 'System Settings'       },
  { id: 'admin_presets',    label: 'Admin Presets',     icon: 'Settings',         route: '/admin/presets',           group: 'System Settings'       },
  { id: 'sent_reports',     label: 'Sent Reports',      icon: 'FileText',         route: '/admin/sent-reports',      group: 'System Settings'       },
];

export const DEFAULT_SHORTCUTS: string[] = [
  'scoreboard', 'weekly_updates', 'leads', 'time_clock', 'contests', 'announcements',
];
