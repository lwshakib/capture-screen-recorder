import { z } from "zod";

// Base folder schema (internal - includes all fields)
export const folderSchema = z.object({
  id: z.string().cuid(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  clerkId: z.string(),
  workspaceId: z.string().cuid(),
  parentFolderId: z.string().cuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Public folder schema (external - excludes sensitive fields)
export const publicFolderSchema = z.object({
  id: z.string().cuid(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  clerkId: z.string(),
  workspaceId: z.string().cuid(),
  parentFolderId: z.string().cuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  videoCount: z.number().optional(),
  folderCount: z.number().optional(),
});

// Extended folder schema with videos and subfolders
export const extendedFolderSchema = publicFolderSchema.extend({
  workspace: z.object({
    id: z.string().cuid(),
    name: z.string(),
  }),
  videos: z
    .array(
      z.object({
        id: z.string().cuid(),
        name: z.string().nullable(),
        status: z.string(),
        createdAt: z.date(),
      })
    )
    .optional(),
  folders: z
    .array(
      z.object({
        id: z.string().cuid(),
        name: z.string(),
        createdAt: z.date(),
      })
    )
    .optional(),
});

// Schema for creating a new folder
export const createFolderSchema = z.object({
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(100, "Folder name must be less than 100 characters")
    .trim(),
  workspaceId: z.string().cuid("Invalid workspace ID"),
  parentFolderId: z
    .string()
    .cuid("Invalid parent folder ID")
    .nullable()
    .optional(),
});

// Schema for updating an existing folder
export const updateFolderSchema = z.object({
  id: z.string().cuid("Invalid folder ID"),
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(100, "Folder name must be less than 100 characters")
    .trim(),
  parentFolderId: z
    .string()
    .cuid("Invalid parent folder ID")
    .nullable()
    .optional(),
});

// Schema for folder query parameters
export const folderQuerySchema = z.object({
  workspaceId: z.string().cuid("Invalid workspace ID").optional(),
  parentFolderId: z
    .string()
    .cuid("Invalid parent folder ID")
    .nullable()
    .optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Schema for folder response
export const folderResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(publicFolderSchema).optional(),
  count: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Schema for single folder response
export const singleFolderResponseSchema = z.object({
  success: z.boolean(),
  data: extendedFolderSchema.optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Schema for folder list response
export const folderListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(publicFolderSchema),
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
export type Folder = z.infer<typeof folderSchema>;
export type PublicFolder = z.infer<typeof publicFolderSchema>;
export type ExtendedFolder = z.infer<typeof extendedFolderSchema>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type FolderQueryParams = z.infer<typeof folderQuerySchema>;
export type FolderResponse = z.infer<typeof folderResponseSchema>;
export type SingleFolderResponse = z.infer<typeof singleFolderResponseSchema>;
export type FolderListResponse = z.infer<typeof folderListResponseSchema>;

// Validation functions
export const validateCreateFolder = (data: unknown): CreateFolderInput => {
  return createFolderSchema.parse(data);
};

export const validateUpdateFolder = (data: unknown): UpdateFolderInput => {
  return updateFolderSchema.parse(data);
};

export const validateFolderQuery = (data: unknown): FolderQueryParams => {
  return folderQuerySchema.parse(data);
};

// Helper function to sanitize folder data for response
export const sanitizeFolderForResponse = (folder: Folder): PublicFolder => {
  return folder;
};
