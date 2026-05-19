import { z } from "zod";

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const createTodoInputSchema = z.object({
  title: z.string().min(1).max(280),
  dueDate: z.string().datetime().optional(),
});

export const patchTodoInputSchema = z
  .object({
    title: z.string().min(1).max(280).optional(),
    completed: z.boolean().optional(),
    dueDate: z.string().datetime().nullable().optional(),
  })
  .refine(
    (v) => v.title !== undefined || v.completed !== undefined || v.dueDate !== undefined,
    { message: "at least one field must be provided" },
  );

export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;
export type PatchTodoInput = z.infer<typeof patchTodoInputSchema>;
