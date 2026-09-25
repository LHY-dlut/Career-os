export interface LibrarySource {
  id: string;
  name: string;
  url: string;
  author: string;
  license: string;
  licenseUrl: string;
  revision?: string;
  checkedAt: string;
  description: string;
  origin?: 'upstream' | 'original';
}

export type LibraryContentStatus = 'complete' | 'outline' | 'external' | 'file-error' | 'original-complete' | 'original-draft';

export interface LibraryResource {
  id: string;
  sourceId: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  kind: 'article' | 'link';
  sourceUrl: string;
  contentPath?: string;
  language?: 'zh' | 'en';
  translationGroupId?: string;
  alternateId?: string;
  titleZh?: string;
  contentStatus?: LibraryContentStatus;
  contentEvidence?: string;
  sourcePath?: string;
  relatedTrainingIds?: string[];
}

export interface LibraryCourseNode {
  id: string;
  title: string;
  titleEn?: string;
  description?: string;
  resourceId?: string;
  order: number;
  children: LibraryCourseNode[];
}

export interface LibraryCourse extends LibraryCourseNode {
  mode: 'path' | 'source';
  sourceId?: string;
  evidence?: string;
}
