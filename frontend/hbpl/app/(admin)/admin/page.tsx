'use client';

import {
  BookOpen,
  ChevronRight,
  Image,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  adminFetchGallery,
  adminFetchManagement,
  adminFetchMatches,
  adminFetchStudents,
  adminFetchTeams,
  adminFetchVolunteers,
} from '@/lib/api';
import { useAdmin } from './_components/admin-shell';
import { SectionHeader } from './_components/admin-ui';

export default function AdminDashboardPage() {
  const { token } = useAdmin();
  const { data: students = [] } = useQuery({ queryKey: ['admin-students', token], queryFn: () => adminFetchStudents(token) });
  const { data: volunteers = [] } = useQuery({ queryKey: ['admin-volunteers', token], queryFn: () => adminFetchVolunteers(token) });
  const { data: gallery = [] } = useQuery({ queryKey: ['admin-gallery', token], queryFn: () => adminFetchGallery(token) });
  const { data: management = [] } = useQuery({ queryKey: ['admin-management', token], queryFn: () => adminFetchManagement(token) });
  const { data: teams = [] } = useQuery({ queryKey: ['admin-teams', token], queryFn: () => adminFetchTeams(token) });
  const { data: matches = [] } = useQuery({ queryKey: ['admin-matches', token], queryFn: () => adminFetchMatches(token) });

  const publishedCount = students.filter((student) => student.result_status === 'published').length;

  const stats = [
    {
      label: 'Registered Students',
      value: students.length,
      sub: `${publishedCount} results published`,
      color: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
      icon: BookOpen,
    },
    {
      label: 'Volunteers',
      value: volunteers.length,
      sub: 'on website',
      color: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
      icon: Users,
    },
    {
      label: 'Gallery Photos',
      value: gallery.length,
      sub: 'uploaded',
      color: 'bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300',
      icon: Image,
    },
    {
      label: 'Management',
      value: management.length,
      sub: 'members',
      color: 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
      icon: Settings,
    },
    {
      label: 'Teams',
      value: teams.length,
      sub: 'registered',
      color: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300',
      icon: Trophy,
    },
    {
      label: 'Matches',
      value: matches.length,
      sub: 'scheduled / played',
      color: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300',
      icon: ChevronRight,
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Dashboard" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-xl p-5 ${stat.color} flex items-start gap-4`}>
            <stat.icon className="w-8 h-8 mt-1 opacity-70" />
            <div>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm font-medium">{stat.label}</p>
              <p className="text-xs opacity-70">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}