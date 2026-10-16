export interface ParentRef {
  id: string
  name: string
  code?: string | null
}

export interface LocationWithParentRelation {
  id: string
  name: string
  parent_id?: string | null
  code?: string | null
}

/**
 * Attaches parent building info (id, name, code) to each location item by
 * resolving `parent_id` against the list of locations in memory.
 *
 * Behavior:
 * - When parent exists in the list, attaches `{ id, name, code }`.
 * - When parent_id is null or undefined, attaches `null`.
 * - When parent_id is not found in the list, attaches `null`.
 */
export function attachParentNames<T extends LocationWithParentRelation>(
  locations: T[]
): (T & { parent: ParentRef | null })[] {
  const map = new Map<string, LocationWithParentRelation>()
  for (const loc of locations) {
    map.set(loc.id, loc)
  }

  return locations.map((loc) => {
    if (!loc.parent_id) {
      return {
        ...loc,
        parent: null,
      }
    }

    const parent = map.get(loc.parent_id)
    if (!parent) {
      return {
        ...loc,
        parent: null,
      }
    }

    return {
      ...loc,
      parent: {
        id: parent.id,
        name: parent.name,
        code: parent.code ?? null,
      },
    }
  })
}
