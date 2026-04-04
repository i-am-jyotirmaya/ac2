import { z } from "zod";

export const RenderRequestSchema = z.object({
  templateKey: z.string().min(1),
  inputs: z.record(z.string(), z.unknown()),
});

export type RenderRequest = z.infer<typeof RenderRequestSchema>;

export const UserPlanSchema = z.enum(["free", "pro"]);
export type UserPlan = z.infer<typeof UserPlanSchema>;

export const WorkspaceRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

export const RegisterRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  plan: UserPlanSchema.default("free"),
  mfaEnabled: z.boolean().default(false),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  mfaCode: z.string().min(4).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const MfaChallengeRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
export type MfaChallengeRequest = z.infer<typeof MfaChallengeRequestSchema>;

export const MfaVerifyRequestSchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().min(4),
});
export type MfaVerifyRequest = z.infer<typeof MfaVerifyRequestSchema>;

export const MfaChallengeResponseSchema = z.object({
  requiresMfa: z.boolean(),
  challengeId: z.string().min(1).optional(),
  debugCode: z.string().nullable(),
});
export type MfaChallengeResponse = z.infer<typeof MfaChallengeResponseSchema>;

export const AuthTokenResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresInSeconds: z.int().positive(),
  user: z.object({
    id: z.string(),
    email: z.email(),
    plan: UserPlanSchema,
    mfaEnabled: z.boolean(),
  }),
});
export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;

export const CreateWorkspaceRequestSchema = z.object({
  name: z.string().min(1),
});
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;

export const WorkspaceMemberSchema = z.object({
  userId: z.string(),
  role: WorkspaceRoleSchema,
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerUserId: z.string(),
  members: z.array(WorkspaceMemberSchema),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const AddWorkspaceMemberRequestSchema = z.object({
  email: z.email(),
  role: WorkspaceRoleSchema.exclude(["owner"]),
});
export type AddWorkspaceMemberRequest = z.infer<typeof AddWorkspaceMemberRequestSchema>;

export const TemplateStatusSchema = z.enum(["draft", "review", "live", "archived"]);
export type TemplateStatus = z.infer<typeof TemplateStatusSchema>;

export const TemplateCategorySchema = z.enum(["social", "email", "ad", "product"]);
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;

export const CreateTemplateRequestSchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().max(160).default(""),
  category: TemplateCategorySchema,
  width: z.int().min(320).max(4096),
  height: z.int().min(320).max(4096),
});
export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequestSchema>;

export const TemplateSummarySchema = CreateTemplateRequestSchema.extend({
  id: z.string(),
  status: TemplateStatusSchema,
  workspaceName: z.string().min(1),
  lastEditedBy: z.string().min(1),
  updatedAt: z.string().min(1),
  usageCount: z.int().nonnegative(),
  version: z.int().positive(),
});
export type TemplateSummary = z.infer<typeof TemplateSummarySchema>;
