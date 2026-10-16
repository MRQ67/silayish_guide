import { z } from "zod"

const coordinatePreprocessor = (val: unknown) => {
  if (val === null || val === undefined || val === "") return null
  if (typeof val === "string") {
    const trimmed = val.trim()
    if (trimmed === "") return null
    const num = Number(trimmed)
    return Number.isNaN(num) ? val : num
  }
  return val
}

const optionalStringPreprocessor = (val: unknown) => {
  if (val === null || val === undefined) return null
  if (typeof val === "string") {
    const trimmed = val.trim()
    return trimmed === "" ? null : trimmed
  }
  return val
}

export const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export const uuidSchema = z.string().regex(UUID_REGEX, "Invalid UUID format")

export function isValidUuid(id: unknown): boolean {
  return typeof id === "string" && uuidSchema.safeParse(id).success
}

export const locationSchema = z
  .object({
    id: z
      .preprocess(
        optionalStringPreprocessor,
        z.string().regex(UUID_REGEX, "Invalid location ID").nullable().optional()
      ),
    name: z.string().trim().min(1, "Name is required"),
    code: z
      .preprocess(
        (val) => {
          if (val === null || val === undefined) return null
          if (typeof val === "string") {
            const trimmed = val.trim()
            return trimmed === "" ? null : trimmed.toUpperCase()
          }
          return val
        },
        z
          .string()
          .min(1, "Code must be between 1 and 20 characters")
          .max(20, "Code must be between 1 and 20 characters")
          .nullable()
      )
      .default(null),
    type: z.enum(["building", "office", "dorm", "lab", "facility"]),
    category_id: z
      .preprocess(
        optionalStringPreprocessor,
        z.string().regex(UUID_REGEX, "Invalid category ID").nullable()
      )
      .default(null),
    parent_id: z
      .preprocess(
        optionalStringPreprocessor,
        z.string().regex(UUID_REGEX, "Invalid parent building ID").nullable()
      )
      .default(null),
    description: z
      .preprocess(optionalStringPreprocessor, z.string().nullable())
      .default(null),
    lat: z
      .preprocess(
        coordinatePreprocessor,
        z
          .number()
          .min(-90, "Latitude must be between -90 and 90")
          .max(90, "Latitude must be between -90 and 90")
          .nullable()
      )
      .default(null),
    lng: z
      .preprocess(
        coordinatePreprocessor,
        z
          .number()
          .min(-180, "Longitude must be between -180 and 180")
          .max(180, "Longitude must be between -180 and 180")
          .nullable()
      )
      .default(null),
    floor: z
      .preprocess(
        coordinatePreprocessor,
        z.number().int("Floor must be an integer").nullable()
      )
      .default(null),
    opening_hours: z
      .preprocess(optionalStringPreprocessor, z.string().nullable())
      .default(null),
    photo_url: z
      .preprocess(optionalStringPreprocessor, z.string().nullable())
      .default(null),
  })
  .superRefine((data, ctx) => {
    const hasLat = data.lat !== null && data.lat !== undefined
    const hasLng = data.lng !== null && data.lng !== undefined

    if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Latitude and longitude must both be set or both be empty",
        path: hasLat ? ["lng"] : ["lat"],
      })
    }

    if (data.id && data.parent_id && data.id === data.parent_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A location cannot be its own parent",
        path: ["parent_id"],
      })
    }
  })

export type LocationFormData = z.infer<typeof locationSchema>
