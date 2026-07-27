import categoryData from '#shared/article-categories.json'

export interface ArticleCategory {
  slug: string
  label: string
  legacyDirectory: string
}

export const articleCategories: readonly ArticleCategory[] = categoryData

export function findCategoryByLegacyPath(path: string): ArticleCategory | null {
  const normalizedPath = path.replaceAll('\\', '/').replace(/^\.?\//, '')

  return articleCategories.find(({ legacyDirectory }) =>
    normalizedPath === legacyDirectory
    || normalizedPath.startsWith(`${legacyDirectory}/`)
    || normalizedPath.includes(`/${legacyDirectory}/`)
    || normalizedPath.endsWith(`/${legacyDirectory}`),
  ) ?? null
}

export function getCategoryLabel(slug: string): string {
  return articleCategories.find(category => category.slug === slug)?.label ?? slug
}
