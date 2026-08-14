interface OrderableAiTool {
  order: number | string
  title: string
}

export function sortAiToolsByOrder<T extends OrderableAiTool>(tools: readonly T[]): T[] {
  return [...tools].sort((left, right) => {
    const orderDifference = Number(left.order) - Number(right.order)
    return orderDifference || left.title.localeCompare(right.title)
  })
}
