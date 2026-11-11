import { z } from "zod"
import { uuidSchema } from "./location"

export const MAX_PEDESTRIAN_PATH_POINTS = 500
export const PEDESTRIAN_PATH_TYPES = [
  "walkway",
  "ramp",
  "stairs",
  "other",
] as const

const pathPositionSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
])

export const lineStringSchema = z
  .object({
    type: z.literal("LineString"),
    coordinates: z
      .array(pathPositionSchema)
      .min(2, "A path needs at least two points")
      .max(
        MAX_PEDESTRIAN_PATH_POINTS,
        `A path cannot exceed ${MAX_PEDESTRIAN_PATH_POINTS} points`
      ),
  })
  .superRefine((line, ctx) => {
    const distinctPoints = new Set(
      line.coordinates.map(([lng, lat]) => `${lng},${lat}`)
    )
    if (distinctPoints.size < 2) {
      ctx.addIssue({
        code: "custom",
        message: "A path needs at least two distinct points",
        path: ["coordinates"],
      })
    }
  })

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && !value.trim() ? null : value),
    z.string().trim().max(max).nullable().default(null)
  )

export const pedestrianPathSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1, "Path name is required").max(120),
  geometry: lineStringSchema,
  path_type: z.enum(PEDESTRIAN_PATH_TYPES),
  wheelchair_accessible: z.boolean(),
  surface: optionalText(100),
  notes: optionalText(1000),
  is_active: z.boolean().default(true),
})

export const pedestrianPathIdSchema = uuidSchema
export type PedestrianPathFormData = z.infer<typeof pedestrianPathSchema>
