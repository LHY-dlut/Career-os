import type { LibraryResource } from '../content/library/types';
import type { Language } from '../i18n/I18nProvider';

/** Explicit content metadata wins; legacy library entries keep their known language. */
export function getLibraryResourceLanguage(resource: LibraryResource): Language {
  if (resource.language) return resource.language;
  if (resource.tags.includes('English') || (resource.sourceId === 'aris-ai-offer' && resource.id.endsWith('-en'))) return 'en';
  return 'zh';
}

/** A display label only: the original source title and Markdown remain intact. */
export function getLibraryResourceTitle(resource: LibraryResource, language: Language): string {
  return language === 'zh' && resource.titleZh?.trim() ? resource.titleZh : resource.title;
}

export function getLibraryResourceForLanguage(
  resource: LibraryResource,
  resources: readonly LibraryResource[],
  language: Language,
): LibraryResource {
  if (getLibraryResourceLanguage(resource) === language || !resource.translationGroupId) return resource;
  const matches = (candidate: LibraryResource) => candidate.sourceId === resource.sourceId &&
    candidate.translationGroupId === resource.translationGroupId && getLibraryResourceLanguage(candidate) === language;
  return resources.find(candidate => candidate.id === resource.alternateId && matches(candidate)) || resources.find(matches) || resource;
}

/** Keep topic order and single-language resources; select one available version per group. */
export function preferLibraryLanguage(resources: readonly LibraryResource[], language: Language): LibraryResource[] {
  const groups = new Set<string>();
  const preferred: LibraryResource[] = [];
  for (const resource of resources) {
    const group = JSON.stringify([resource.sourceId, resource.translationGroupId || resource.id]);
    if (groups.has(group)) continue;
    groups.add(group);
    preferred.push(getLibraryResourceForLanguage(resource, resources, language));
  }
  return preferred;
}
