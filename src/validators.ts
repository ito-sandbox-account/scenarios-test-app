import { z } from "zod";

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const prioritySchema = z.enum(["low", "medium", "high"]);

export const createTodoInputSchema = z.object({
  text: z.string().min(1).max(280),
  dueDate: z.string().datetime().optional(),
  priority: prioritySchema.optional(),
});

export const patchTodoInputSchema = z
  .object({
    text: z.string().min(1).max(280).optional(),
    completed: z.boolean().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    priority: prioritySchema.optional(),
  })
  .refine(
    (v) =>
      v.text !== undefined ||
      v.completed !== undefined ||
      v.dueDate !== undefined ||
      v.priority !== undefined,
    { message: "at least one field must be provided" },
  );

export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;
export type PatchTodoInput = z.infer<typeof patchTodoInputSchema>;
