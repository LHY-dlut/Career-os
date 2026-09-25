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
}

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
}
