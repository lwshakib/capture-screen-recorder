import { z } from "zod";

// Notification types
export const NotificationType = z.enum([
  "WORKSPACE_INVITE",
  "VIDEO_PROCESSING_COMPLETED",
  "NEW_VIDEO_UPLOADED",
  "WORKSPACE_JOIN_ACCEPTED",
  "WORKSPACE_REMOVED",
  "WORKSPACE_INVITE_DECLINED",
  "WORKSPACE_DELETED",
]);

export const NotificationStatus = z.enum(["UNREAD", "READ"]);

// Base notification schema
export const NotificationSchema = z.object({
  id: z.string(),
  type: NotificationType,
  title: z.string(),
  message: z.string(),
  status: NotificationStatus,
  clerkId: z.string(),
  workspaceId: z.string().optional(),
  videoId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Create notification input
export const CreateNotificationInput = z.object({
  type: NotificationType,
  title: z.string(),
  message: z.string(),
  clerkId: z.string(),
  workspaceId: z.string().optional(),
  videoId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Update notification input
export const UpdateNotificationInput = z.object({
  status: NotificationStatus.optional(),
});

// Validation functions
export const validateCreateNotification = (data: unknown) => {
  return CreateNotificationInput.parse(data);
};

export const validateUpdateNotification = (data: unknown) => {
  return UpdateNotificationInput.parse(data);
};

export const validateCreateInvitation = (data: unknown) => {
  return CreateInvitationInput.parse(data);
};

export const validateAcceptInvitation = (data: unknown) => {
  return AcceptInvitationInput.parse(data);
};

// Workspace invitation schemas
export const WorkspaceInvitationStatus = z.enum([
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
]);

export const WorkspaceInvitationSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  inviterId: z.string(),
  inviteeId: z.string(),
  status: WorkspaceInvitationStatus,
  expiresAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Create invitation input
export const CreateInvitationInput = z.object({
  workspaceId: z.string(),
  inviteeId: z.string(),
});

// Accept invitation input
export const AcceptInvitationInput = z.object({
  invitationId: z.string(),
  action: z.enum(["accept", "decline"]),
});

// Response types
export type Notification = z.infer<typeof NotificationSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationInput>;
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationInput>;
export type WorkspaceInvitation = z.infer<typeof WorkspaceInvitationSchema>;
export type CreateInvitationInput = z.infer<typeof CreateInvitationInput>;
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationInput>;

// API Response types
export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  count: number;
  error?: string;
}

export interface SingleNotificationResponse {
  success: boolean;
  data: Notification;
  message?: string;
  error?: string;
}

export interface InvitationsResponse {
  success: boolean;
  data: WorkspaceInvitation[];
  count: number;
  error?: string;
}

export interface SingleInvitationResponse {
  success: boolean;
  data: WorkspaceInvitation;
  message?: string;
  error?: string;
}
