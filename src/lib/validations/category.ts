import { z } from "zod"
import { uuidSchema } from "./location"

export const categorySchema = z.object({
  id: uuidSchema.optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(60, "Name must be 60 characters or fewer"),
  icon: z
    .preprocess(
      (value) => (typeof value === "string" && !value.trim() ? null : value),
      z.string().trim().max(40).nullable()
    )
    .default(null),
  color: z
    .preprocess(
      (value) => (typeof value === "string" && !value.trim() ? null : value),
      z
        .string()
        .regex(/^#[\da-fA-F]{6}$/, "Use a #RRGGBB color")
        .nullable()
    )
    .default(null),
})

export type CategoryFormData = z.infer<typeof categorySchema>
