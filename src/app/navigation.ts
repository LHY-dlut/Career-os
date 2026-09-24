export const views = ['dashboard', 'knowledge', 'questions', 'review', 'coding', 'applications', 'interviews', 'copilot', 'settings'] as const;
export function pathFor(view: string, id?: string) {
  if (!views.includes(view as typeof views[number])) return '/dashboard';
  if (view === 'review') return id ? `/review?question=${encodeURIComponent(id)}` : '/review';
  return `/${view}${id ? `/${encodeURIComponent(id)}` : ''}`;
}
