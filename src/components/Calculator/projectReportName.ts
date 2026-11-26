// Read the canonical saved project name without changing project data.
export function getSavedProjectName(projectId?: string): string {
  if (!projectId) return '';
  try {
    const projects: unknown = JSON.parse(localStorage.getItem('architect_projects') || '[]');
    if (!Array.isArray(projects)) return '';
    const project = projects.find(p => p && p.id === projectId);
    return typeof project?.name === 'string' ? project.name.trim() : '';
  } catch { return ''; }
}
