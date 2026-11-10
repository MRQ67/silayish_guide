import { z } from "zod"
import { uuidSchema } from "./location"

export const entranceSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1, "Entrance name is required").max(80),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  accessibility: z
    .preprocess(
      (value) => (typeof value === "string" && !value.trim() ? null : value),
      z.string().trim().max(250).nullable()
    )
    .default(null),
})

export const entranceListSchema = z
  .array(entranceSchema)
  .max(100)
  .superRefine((entrances, ctx) => {
    const ids = new Set<string>()
    entrances.forEach((entrance, index) => {
      if (ids.has(entrance.id)) {
        ctx.addIssue({
          code: "custom",
          message: "Entrance IDs must be unique",
          path: [index, "id"],
        })
      }
      ids.add(entrance.id)
    })
  })

export type EntranceFormData = z.infer<typeof entranceSchema>
