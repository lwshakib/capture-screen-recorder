import { z } from "zod";

// Base workspace schema (internal - includes all fields)
export const workspaceSchema = z.object({
  id: z.string().cuid(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  canDelete: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  adminId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Public workspace schema (external - excludes sensitive fields)
export const publicWorkspaceSchema = z.object({
  id: z.string().cuid(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  canDelete: z.boolean().default(true),
  adminId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new workspace
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(100, "Workspace name must be less than 100 characters")
    .trim(),
});

// Schema for updating an existing workspace
export const updateWorkspaceSchema = z.object({
  id: z.string().cuid("Invalid workspace ID"),
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(100, "Workspace name must be less than 100 characters")
    .trim(),
});

// Schema for workspace query parameters
export const workspaceQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Schema for workspace response
export const workspaceResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(publicWorkspaceSchema).optional(),
  count: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Schema for single workspace response
export const singleWorkspaceResponseSchema = z.object({
  success: z.boolean(),
  data: publicWorkspaceSchema.optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Schema for workspace list response
export const workspaceListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(publicWorkspaceSchema),
  count: z.number(),
  pagination: z
    .object({
      limit: z.number(),
      offset: z.number(),
      total: z.number(),
      hasMore: z.boolean(),
    })
    .optional(),
});

// Type exports
export type Workspace = z.infer<typeof workspaceSchema>;
export type PublicWorkspace = z.infer<typeof publicWorkspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type WorkspaceQueryParams = z.infer<typeof workspaceQuerySchema>;
export type WorkspaceResponse = z.infer<typeof workspaceResponseSchema>;
export type SingleWorkspaceResponse = z.infer<
  typeof singleWorkspaceResponseSchema
>;
export type WorkspaceListResponse = z.infer<typeof workspaceListResponseSchema>;

// Validation functions
export const validateCreateWorkspace = (
  data: unknown
): CreateWorkspaceInput => {
  return createWorkspaceSchema.parse(data);
};

export const validateUpdateWorkspace = (
  data: unknown
): UpdateWorkspaceInput => {
  return updateWorkspaceSchema.parse(data);
};

export const validateWorkspaceQuery = (data: unknown): WorkspaceQueryParams => {
  return workspaceQuerySchema.parse(data);
};

// Helper function to sanitize workspace data for response
export const sanitizeWorkspaceForResponse = (
  workspace: Workspace
): PublicWorkspace => {
  return workspace;
};
