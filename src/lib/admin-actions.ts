import { prisma } from "@/lib/prisma";
import { COMPANY_ADMIN_EMAIL, isCompanyAdminEmail, writeAdminAudit } from "@/lib/admin";
import { invalidateSiteSettingsCache, savePastPaperFee, savePlanPrices, SITE_SETTINGS_ID } from "@/lib/site-settings";
import { parsePastPaperKey } from "@/lib/past-papers";
import { pastPaperVisibility } from "@/lib/past-papers/import-service";
import { slugify } from "@/lib/search-tutors";
import { syncTutorBadges } from "@/lib/subscription";
import { syncTutorTrustBadge } from "@/lib/tutor-badges";
import {
  activatePaidSafepaySubscription,
  fetchSafepayTrackerState,
  isSafepayTrackerPaid,
} from "@/lib/safepay-complete";
import { safepayConfigured } from "@/lib/safepay";
import { PLANS } from "@/lib/plans";
import type { Role, SubscriptionPlan } from "@/lib/types";
import { isR2Configured, r2NotConfiguredMessage } from "@/lib/past-papers/r2";
import { syncPastPapersFromR2 } from "@/lib/past-papers/past-paper-sync";
import { syncSubjectsFromSources } from "@/lib/subject-sync";
import {
  sendRecommendationApprovedEmail,
  sendRecommendationRejectedEmail,
  sendReviewPublishedEmail,
  sendVerificationApprovedEmail,
} from "@/lib/email-nurture";
import { sendRecoveryEmail1Campaign } from "@/lib/tutor-recovery-send";
import { scanMessage } from "@/lib/message-moderation";
import { notifyMessageWarning } from "@/lib/message-warning";
import { z } from "zod";

const PLANS_SET = new Set(PLANS.map((p) => p.id));
const ROLES = ["STUDENT", "TUTOR", "ADMIN"] as const;

const payloadSchema = z.object({
  action: z.string().min(1),
  id: z.string().optional(),
  adminNote: z.string().max(2000).optional().nullable(),
  verified: z.boolean().optional(),
  role: z.enum(ROLES).optional(),
  confirmAdmin: z.boolean().optional(),
  confirmBypass: z.boolean().optional(),
  confirmEmail: z.string().email().optional(),
  confirmSend: z.boolean().optional(),
  plan: z.string().optional(),
  days: z.coerce.number().int().min(1).max(730).optional(),
  until: z.string().optional().nullable(),
  emailVerified: z.boolean().optional(),
  active: z.boolean().optional(),
  forceActive: z.boolean().optional(),
  highlighted: z.boolean().optional(),
  status: z.string().optional(),
  name: z.string().max(120).optional(),
  slug: z.string().max(120).optional(),
  maintenanceMode: z.boolean().optional(),
  homepageAnnouncement: z.string().max(500).optional(),
  disableSignups: z.boolean().optional(),
  disableAiAssistant: z.boolean().optional(),
  pastPaperFeePkr: z.coerce.number().min(0).max(100_000).optional(),
  catalogKey: z.string().max(200).optional(),
  fileUrl: z.string().max(2000).optional().nullable(),
  published: z.boolean().optional(),
  board: z.string().max(120).optional(),
  year: z.coerce.number().int().min(1990).max(2035).optional(),
  paperType: z.string().max(80).optional(),
  title: z.string().max(200).optional(),
  plans: z
    .array(
      z.object({
        id: z.enum([
          "STUDENT_PASS",
          "STUDENT_PRO",
          "TUTOR_BASIC",
          "VERIFIED_TUTOR",
          "HIGHLIGHTED_AD",
          "AD_BOOST",
          "EXTRA_PROFILE_ADS",
          "UNLIMITED_ADS",
        ]),
        pricePkr: z.coerce.number().min(0).max(10_000_000),
        name: z.string().min(1).max(80),
        description: z.string().max(300),
        promoEnabled: z.boolean().optional(),
        promoPricePkr: z.coerce.number().min(0).max(10_000_000).optional(),
        promoUntil: z.string().max(10).optional(),
        promoLabel: z.string().max(60).optional(),
        promoNote: z.string().max(280).optional(),
      }),
    )
    .optional(),
  headline: z.string().max(120).optional().nullable(),
  bio: z.string().max(8000).optional(),
  subjects: z.string().max(500).optional(),
  hourlyRate: z.coerce.number().min(0).max(50000).optional(),
  location: z.string().max(200).optional(),
  online: z.boolean().optional(),
  inPerson: z.boolean().optional(),
  tracker: z.string().optional(),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  email: z.string().email().optional(),
});

export type AdminActionPayload = z.infer<typeof payloadSchema>;

class AdminActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function needId(id: string | undefined) {
  if (!id) throw new AdminActionError("id is required");
  return id;
}

function detailOf(payload: AdminActionPayload) {
  const { action, id, ...rest } = payload;
  const slim: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && v !== null && v !== "") slim[k] = v;
  }
  return Object.keys(slim).length ? JSON.stringify({ action, id, ...slim }) : action;
}

async function resolveReportedUserId(targetType: string, targetId: string) {
  if (targetType === "USER") return targetId;
  if (targetType === "TUTOR") {
    const profile = await prisma.tutorProfile.findUnique({
      where: { id: targetId },
      select: { userId: true },
    });
    return profile?.userId || null;
  }
  if (targetType === "STUDENT_AD") {
    const ad = await prisma.studentAd.findUnique({
      where: { id: targetId },
      select: { userId: true },
    });
    return ad?.userId || null;
  }
  return null;
}

async function grantPlan(userId: string, plan: SubscriptionPlan, days: number) {
  const existing = await prisma.subscription.findFirst({
    where: { userId, plan, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  if (existing) {
    const base =
      existing.currentPeriodEnd && existing.currentPeriodEnd > now
        ? existing.currentPeriodEnd
        : now;
    return prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: new Date(base.getTime() + days * 86400000),
      },
    });
  }
  return prisma.subscription.create({
    data: {
      userId,
      plan,
      status: "ACTIVE",
      currentPeriodEnd: new Date(now.getTime() + days * 86400000),
      stripeSubscriptionId: `admin_comp_${crypto.randomUUID()}`,
    },
  });
}

const ACTION_ALIASES: Record<string, string> = {
  verify_email: "set_email_verified",
  change_role: "set_role",
  open_tutor_ad: "restore_tutor_ad",
  create_subject: "subject_create",
  delete_subject: "subject_delete",
  sync_subjects: "subject_sync",
  update_subjects: "subject_sync",
  sync_past_papers: "past_paper_sync",
  update_past_papers: "past_paper_sync",
};

export async function runAdminAction(adminId: string, raw: unknown) {
  const payload = payloadSchema.parse(raw);
  const action = ACTION_ALIASES[payload.action] || payload.action;
  let targetType = "unknown";
  let targetId = payload.id || payload.conversationId || payload.messageId || "none";
  let extra: Record<string, unknown> = {};

  switch (action) {
    case "hide_ad":
    case "open_ad": {
      const id = needId(payload.id);
      targetType = "StudentAd";
      targetId = id;
      await prisma.studentAd.update({
        where: { id },
        data: { status: action === "hide_ad" ? "HIDDEN" : "OPEN" },
      });
      break;
    }
    case "delete_student_ad": {
      const id = needId(payload.id);
      targetType = "StudentAd";
      targetId = id;
      await prisma.studentAd.delete({ where: { id } });
      break;
    }
    case "hide_tutor_ad":
    case "restore_tutor_ad": {
      const id = needId(payload.id);
      targetType = "TutorAd";
      targetId = id;
      await prisma.tutorAd.update({
        where: { id },
        data: { status: action === "hide_tutor_ad" ? "HIDDEN" : "ACTIVE" },
      });
      break;
    }
    case "pause_tutor_ad": {
      const id = needId(payload.id);
      targetType = "TutorAd";
      targetId = id;
      await prisma.tutorAd.update({ where: { id }, data: { status: "PAUSED" } });
      break;
    }
    case "delete_tutor_ad": {
      const id = needId(payload.id);
      targetType = "TutorAd";
      targetId = id;
      await prisma.tutorAd.delete({ where: { id } });
      break;
    }
    case "deactivate_tutor":
    case "activate_tutor": {
      const id = needId(payload.id);
      targetType = "TutorProfile";
      targetId = id;
      const active = action === "activate_tutor";
      await prisma.tutorProfile.update({
        where: { id },
        data: { active, forceActive: active },
      });
      break;
    }
    case "set_verified": {
      const id = needId(payload.id);
      targetType = "TutorProfile";
      targetId = id;
      await prisma.tutorProfile.update({
        where: { id },
        data: { verified: Boolean(payload.verified) },
      });
      break;
    }
    case "set_highlight": {
      const id = needId(payload.id);
      targetType = "TutorProfile";
      targetId = id;
      const until = payload.until
        ? new Date(payload.until)
        : payload.days
          ? new Date(Date.now() + payload.days * 86400000)
          : null;
      const on = Boolean(until && until > new Date());
      await prisma.$transaction([
        prisma.tutorProfile.update({
          where: { id },
          data: {
            highlighted: on,
            highlightedUntil: until,
          },
        }),
        prisma.tutorAd.updateMany({
          where: { tutorProfileId: id, status: "ACTIVE" },
          data: { highlightedUntil: until },
        }),
        prisma.subjectProfile.updateMany({
          where: { tutorProfileId: id, status: "ACTIVE" },
          data: { highlightedUntil: until },
        }),
      ]);
      break;
    }
    case "set_boost": {
      const id = needId(payload.id);
      targetType = "TutorProfile";
      targetId = id;
      const until = payload.until
        ? new Date(payload.until)
        : payload.days
          ? new Date(Date.now() + payload.days * 86400000)
          : null;
      await prisma.$transaction([
        prisma.tutorProfile.update({
          where: { id },
          data: { boostUntil: until },
        }),
        prisma.tutorAd.updateMany({
          where: { tutorProfileId: id, status: "ACTIVE" },
          data: { boostUntil: until },
        }),
        prisma.subjectProfile.updateMany({
          where: { tutorProfileId: id, status: "ACTIVE" },
          data: { boostUntil: until },
        }),
      ]);
      break;
    }
    case "update_tutor": {
      const id = needId(payload.id);
      targetType = "TutorProfile";
      targetId = id;
      await prisma.tutorProfile.update({
        where: { id },
        data: {
          ...(payload.headline !== undefined ? { headline: payload.headline || null } : {}),
          ...(payload.bio !== undefined ? { bio: payload.bio } : {}),
          ...(payload.subjects !== undefined ? { subjects: payload.subjects } : {}),
          ...(payload.hourlyRate !== undefined ? { hourlyRate: payload.hourlyRate } : {}),
          ...(payload.location !== undefined ? { location: payload.location } : {}),
          ...(payload.online !== undefined ? { online: payload.online } : {}),
          ...(payload.inPerson !== undefined ? { inPerson: payload.inPerson } : {}),
          ...(payload.verified !== undefined ? { verified: payload.verified } : {}),
          ...(payload.active !== undefined
            ? { active: payload.active, forceActive: payload.active }
            : {}),
        },
      });
      break;
    }
    case "verify_approve":
    case "verify_reject": {
      const id = needId(payload.id);
      targetType = "VerificationRequest";
      targetId = id;
      const reqItem = await prisma.verificationRequest.update({
        where: { id },
        data: {
          status: action === "verify_approve" ? "APPROVED" : "REJECTED",
          adminNote: payload.adminNote ? String(payload.adminNote) : null,
        },
      });
      if (action === "verify_approve") {
        await prisma.tutorProfile.updateMany({
          where: { userId: reqItem.userId },
          data: { verified: true },
        });
        void sendVerificationApprovedEmail(reqItem.userId).catch((err) =>
          console.error("[email-nurture] verification approved", err),
        );
      }
      break;
    }
    case "review_publish":
    case "review_hide": {
      const id = needId(payload.id);
      targetType = "Review";
      targetId = id;
      const review = await prisma.review.update({
        where: { id },
        data: { status: action === "review_publish" ? "PUBLISHED" : "HIDDEN" },
        select: { tutorProfileId: true },
      });
      await syncTutorTrustBadge(review.tutorProfileId);
      if (action === "review_publish") {
        void sendReviewPublishedEmail(id).catch((err) =>
          console.error("[email-nurture] review published", err),
        );
      }
      break;
    }
    case "review_delete": {
      const id = needId(payload.id);
      targetType = "Review";
      targetId = id;
      const review = await prisma.review.findUnique({
        where: { id },
        select: { tutorProfileId: true },
      });
      await prisma.review.delete({ where: { id } });
      if (review) await syncTutorTrustBadge(review.tutorProfileId);
      break;
    }
    case "recommendation_approve":
    case "recommendation_reject": {
      const id = needId(payload.id);
      targetType = "TutorRecommendation";
      targetId = id;
      const item = await prisma.tutorRecommendation.update({
        where: { id },
        data: {
          status: action === "recommendation_approve" ? "APPROVED" : "REJECTED",
          adminNote: payload.adminNote ? String(payload.adminNote) : null,
        },
        select: { tutorProfileId: true },
      });
      await syncTutorTrustBadge(item.tutorProfileId);
      if (action === "recommendation_approve") {
        void sendRecommendationApprovedEmail(id).catch((err) =>
          console.error("[email-nurture] recommendation approved", err),
        );
      } else {
        void sendRecommendationRejectedEmail(id, payload.adminNote || undefined).catch((err) =>
          console.error("[email-nurture] recommendation rejected", err),
        );
      }
      break;
    }
    case "report_resolve":
    case "report_dismiss": {
      const id = needId(payload.id);
      targetType = "Report";
      targetId = id;
      await prisma.report.update({
        where: { id },
        data: { status: action === "report_resolve" ? "RESOLVED" : "DISMISSED" },
      });
      break;
    }
    case "report_suspend": {
      const id = needId(payload.id);
      targetType = "Report";
      targetId = id;
      const report = await prisma.report.findUnique({ where: { id } });
      if (!report) throw new AdminActionError("Report not found", 404);
      const userId = await resolveReportedUserId(report.targetType, report.targetId);
      if (!userId) throw new AdminActionError("Could not resolve reported user");
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (target && isCompanyAdminEmail(target.email)) {
        throw new AdminActionError("Cannot suspend the company admin");
      }
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { suspended: true } }),
        prisma.tutorProfile.updateMany({ where: { userId }, data: { active: false, forceActive: false } }),
        prisma.report.update({ where: { id }, data: { status: "RESOLVED" } }),
      ]);
      break;
    }
    case "suspend_user":
    case "unsuspend_user": {
      const id = needId(payload.id);
      targetType = "User";
      targetId = id;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new AdminActionError("User not found", 404);
      if (action === "suspend_user" && isCompanyAdminEmail(user.email)) {
        throw new AdminActionError("Cannot suspend the company admin");
      }
      await prisma.user.update({
        where: { id },
        data: { suspended: action === "suspend_user" },
      });
      if (action === "suspend_user") {
        await prisma.tutorProfile.updateMany({
          where: { userId: id },
          data: { active: false, forceActive: false },
        });
      } else {
        const tutorUser = await prisma.user.findUnique({
          where: { id },
          select: { role: true },
        });
        if (tutorUser?.role === "TUTOR") {
          await syncTutorBadges(id);
        }
      }
      break;
    }
    case "set_email_verified": {
      const id = needId(payload.id);
      targetType = "User";
      targetId = id;
      const verified = payload.emailVerified !== false && payload.verified !== false;
      await prisma.user.update({
        where: { id },
        data: { emailVerified: verified ? new Date() : null },
      });
      const tutorUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });
      if (tutorUser?.role === "TUTOR") {
        await syncTutorBadges(id);
      }
      break;
    }
    case "set_role": {
      const id = needId(payload.id);
      targetType = "User";
      targetId = id;
      const role = payload.role as Role | undefined;
      if (!role) throw new AdminActionError("role is required");
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new AdminActionError("User not found", 404);
      if (isCompanyAdminEmail(user.email) && role !== "ADMIN") {
        throw new AdminActionError("Cannot change the company admin role");
      }
      if (role === "ADMIN" && !payload.confirmAdmin) {
        throw new AdminActionError("Confirm promoting this user to ADMIN");
      }
      if (user.role === "ADMIN" && role !== "ADMIN") {
        const otherAdmins = await prisma.user.count({
          where: { role: "ADMIN", id: { not: id } },
        });
        if (otherAdmins === 0) {
          throw new AdminActionError("Cannot demote the last admin");
        }
      }
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data: { role } });
        if (role === "TUTOR") {
          const profile = await tx.tutorProfile.findUnique({ where: { userId: id } });
          if (!profile) {
            await tx.tutorProfile.create({
              data: {
                userId: id,
                bio: "New tutor — update this profile.",
                subjects: "",
                hourlyRate: 1500,
                location: "Online",
                online: true,
                inPerson: false,
                active: false,
              },
            });
          }
        }
      });
      break;
    }
    case "grant_plan": {
      let id = payload.id;
      if (!id && payload.email) {
        const found = await prisma.user.findUnique({
          where: { email: payload.email.trim().toLowerCase() },
          select: { id: true },
        });
        if (!found) throw new AdminActionError("User not found", 404);
        id = found.id;
      }
      id = needId(id);
      targetType = "User";
      targetId = id;
      const plan = payload.plan as SubscriptionPlan | undefined;
      if (!plan || !PLANS_SET.has(plan)) throw new AdminActionError("Valid plan is required");
      const days = payload.days || 30;
      await grantPlan(id, plan, days);
      await syncTutorBadges(id);
      break;
    }
    case "revoke_subscription": {
      const id = needId(payload.id);
      targetType = "Subscription";
      targetId = id;
      const sub = await prisma.subscription.update({
        where: { id },
        data: { status: "CANCELED" },
      });
      await syncTutorBadges(sub.userId);
      break;
    }
    case "complete_payment": {
      const id = needId(payload.id);
      targetType = "Subscription";
      targetId = id;
      const existing = await prisma.subscription.findUnique({ where: { id } });
      if (!existing) throw new AdminActionError("Subscription not found", 404);
      if (!["INCOMPLETE", "PAST_DUE"].includes(existing.status) && !payload.confirmBypass) {
        throw new AdminActionError(
          "Subscription is not awaiting payment. Pass confirmBypass for manual bank-transfer grants.",
        );
      }
      const note = (payload.adminNote || "").trim();
      if (payload.confirmBypass && note.length < 8) {
        throw new AdminActionError(
          "adminNote (min 8 characters) is required when confirmBypass is set",
        );
      }
      if (
        !payload.confirmBypass &&
        ["INCOMPLETE", "PAST_DUE"].includes(existing.status) &&
        note.length < 4
      ) {
        throw new AdminActionError(
          "Add adminNote with bank-transfer reference or reason (min 4 characters)",
        );
      }
      const sub = await prisma.subscription.update({
        where: { id },
        data: {
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + (payload.days || 30) * 86400000),
        },
      });
      await prisma.subscription.updateMany({
        where: {
          userId: sub.userId,
          plan: sub.plan,
          status: "INCOMPLETE",
          id: { not: sub.id },
        },
        data: { status: "CANCELED" },
      });
      await syncTutorBadges(sub.userId);
      extra = {
        paymentBypass: true,
        priorStatus: existing.status,
        plan: sub.plan,
        userId: sub.userId,
        days: payload.days || 30,
        adminNote: note || undefined,
        confirmBypass: Boolean(payload.confirmBypass),
      };
      break;
    }
    case "recover_payment": {
      const id = needId(payload.id);
      targetType = "Subscription";
      targetId = id;
      if (!safepayConfigured()) throw new AdminActionError("Safepay is not configured", 503);
      const sub = await prisma.subscription.findUnique({ where: { id } });
      if (!sub?.stripeSubscriptionId) throw new AdminActionError("No tracker on this payment");
      const { state, report, tracker } = await fetchSafepayTrackerState(sub.stripeSubscriptionId);
      if (!isSafepayTrackerPaid(state, report)) {
        throw new AdminActionError(`Safepay has not marked this payment complete (${state || "unknown"})`, 409);
      }
      const result = await activatePaidSafepaySubscription({
        tracker,
        planHint: sub.plan as SubscriptionPlan,
      });
      if (!result.ok) throw new AdminActionError("Could not activate payment");
      break;
    }
    case "delete_user": {
      const id = needId(payload.id);
      targetType = "User";
      targetId = id;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new AdminActionError("User not found", 404);
      if (isCompanyAdminEmail(user.email)) {
        throw new AdminActionError("Cannot delete the company admin");
      }
      if (user.id === adminId) throw new AdminActionError("Cannot delete your own account");
      if (!payload.confirmEmail || payload.confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
        throw new AdminActionError("Type the user email to confirm hard delete");
      }
      if (user.role === "ADMIN") {
        const otherAdmins = await prisma.user.count({
          where: { role: "ADMIN", id: { not: id } },
        });
        if (otherAdmins === 0) throw new AdminActionError("Cannot delete the last admin");
      }
      await prisma.user.delete({ where: { id } });
      break;
    }
    case "delete_message": {
      const id = needId(payload.messageId || payload.id);
      targetType = "Message";
      targetId = id;
      await prisma.message.delete({ where: { id } });
      break;
    }
    case "delete_conversation": {
      const id = needId(payload.conversationId || payload.id);
      targetType = "Conversation";
      targetId = id;
      await prisma.conversation.delete({ where: { id } });
      break;
    }
    case "warn_message_sender": {
      const id = needId(payload.messageId || payload.id);
      targetType = "Message";
      targetId = id;
      const message = await prisma.message.findUnique({
        where: { id },
        include: { sender: { select: { id: true, name: true, email: true } } },
      });
      if (!message) throw new AdminActionError("Message not found", 404);
      const result = await notifyMessageWarning({
        to: message.sender.email,
        name: message.sender.name,
        preview: message.body,
        adminNote: payload.adminNote || undefined,
      });
      if (!result.sent) {
        throw new AdminActionError(result.error || "Could not send warning email", 502);
      }
      extra = { warnedUserId: message.sender.id };
      break;
    }
    case "warn_conversation_offenders": {
      const id = needId(payload.conversationId || payload.id);
      targetType = "Conversation";
      targetId = id;
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          messages: {
            include: { sender: { select: { id: true, name: true, email: true } } },
          },
        },
      });
      if (!conversation) throw new AdminActionError("Conversation not found", 404);
      const warned = new Set<string>();
      let sent = 0;
      const errors: string[] = [];
      for (const message of conversation.messages) {
        if (!scanMessage(message.body).flagged) continue;
        if (warned.has(message.senderId)) continue;
        warned.add(message.senderId);
        const result = await notifyMessageWarning({
          to: message.sender.email,
          name: message.sender.name,
          preview: message.body,
          adminNote: payload.adminNote || undefined,
        });
        if (result.sent) sent += 1;
        else if (result.error) errors.push(result.error);
      }
      if (!sent) {
        throw new AdminActionError(
          errors[0] || "No flagged senders to warn in this conversation",
          errors.length ? 502 : 400,
        );
      }
      extra = { warningsSent: sent };
      break;
    }
    case "subject_create": {
      const name = (payload.name || "").trim();
      if (!name) throw new AdminActionError("Subject name is required");
      const slug = (payload.slug || slugify(name)).trim();
      targetType = "Subject";
      const created = await prisma.subject.create({ data: { name, slug } });
      targetId = created.id;
      break;
    }
    case "subject_rename": {
      const id = needId(payload.id);
      targetType = "Subject";
      targetId = id;
      const name = (payload.name || "").trim();
      if (!name) throw new AdminActionError("Subject name is required");
      await prisma.subject.update({
        where: { id },
        data: { name, slug: (payload.slug || slugify(name)).trim() },
      });
      break;
    }
    case "subject_delete": {
      const id = needId(payload.id);
      targetType = "Subject";
      targetId = id;
      await prisma.subject.delete({ where: { id } });
      break;
    }
    case "subject_sync": {
      targetType = "Subject";
      targetId = "catalog";
      extra = await syncSubjectsFromSources();
      break;
    }
    case "past_paper_sync": {
      targetType = "PastPaper";
      targetId = "catalog";
      if (!isR2Configured()) {
        throw new AdminActionError(r2NotConfiguredMessage(), 503);
      }
      extra = await syncPastPapersFromR2();
      break;
    }
    case "update_settings": {
      targetType = "SiteSettings";
      targetId = SITE_SETTINGS_ID;
      await prisma.siteSettings.upsert({
        where: { id: SITE_SETTINGS_ID },
        update: {
          ...(payload.maintenanceMode !== undefined
            ? { maintenanceMode: payload.maintenanceMode }
            : {}),
          ...(payload.homepageAnnouncement !== undefined
            ? { homepageAnnouncement: payload.homepageAnnouncement }
            : {}),
          ...(payload.disableSignups !== undefined
            ? { disableSignups: payload.disableSignups }
            : {}),
          ...(payload.disableAiAssistant !== undefined
            ? { disableAiAssistant: payload.disableAiAssistant }
            : {}),
          ...(payload.pastPaperFeePkr !== undefined
            ? { pastPaperFeePkr: Math.round(payload.pastPaperFeePkr) }
            : {}),
        },
        create: {
          id: SITE_SETTINGS_ID,
          maintenanceMode: Boolean(payload.maintenanceMode),
          homepageAnnouncement: payload.homepageAnnouncement || "",
          disableSignups: Boolean(payload.disableSignups),
          disableAiAssistant: Boolean(payload.disableAiAssistant),
          ...(payload.pastPaperFeePkr !== undefined
            ? { pastPaperFeePkr: Math.round(payload.pastPaperFeePkr) }
            : {}),
        },
      });
      invalidateSiteSettingsCache();
      break;
    }
    case "update_plan_prices": {
      targetType = "SiteSettings";
      targetId = SITE_SETTINGS_ID;
      if (!payload.plans?.length) throw new AdminActionError("plans are required");
      for (const p of payload.plans) {
        if (p.promoEnabled && p.promoUntil && !/^\d{4}-\d{2}-\d{2}$/.test(p.promoUntil)) {
          throw new AdminActionError("Promo end date must be YYYY-MM-DD");
        }
        if (p.promoEnabled && !p.promoUntil) {
          throw new AdminActionError(`Set an end date for the ${p.name} offer`);
        }
      }
      const planPrices = Object.fromEntries(
        payload.plans.map((p) => [
          p.id,
          {
            pricePkr: Math.round(p.pricePkr),
            name: p.name.trim(),
            description: p.description.trim(),
            promoEnabled: Boolean(p.promoEnabled),
            promoPricePkr:
              p.promoPricePkr == null ? undefined : Math.round(p.promoPricePkr),
            promoUntil: p.promoUntil || undefined,
            promoLabel: p.promoLabel?.trim() || undefined,
            promoNote: p.promoNote?.trim() || undefined,
          },
        ]),
      );
      await savePlanPrices(planPrices);
      break;
    }
    case "update_past_paper_fee": {
      targetType = "SiteSettings";
      targetId = SITE_SETTINGS_ID;
      if (payload.pastPaperFeePkr == null) throw new AdminActionError("Fee is required");
      await savePastPaperFee(payload.pastPaperFeePkr);
      break;
    }
    case "past_paper_save": {
      const catalogKey = (payload.catalogKey || "").trim();
      if (!catalogKey) throw new AdminActionError("catalogKey is required");
      const listing = parsePastPaperKey(catalogKey);
      const existing = await prisma.pastPaper.findUnique({ where: { catalogKey } });
      if (!listing && !existing) throw new AdminActionError("Unknown past paper");
      targetType = "PastPaper";
      const flags =
        payload.published !== undefined ? pastPaperVisibility(payload.published, payload.published) : {};
      if (existing) {
        const saved = await prisma.pastPaper.update({
          where: { catalogKey },
          data: {
            ...(payload.fileUrl !== undefined ? { fileUrl: payload.fileUrl || null } : {}),
            ...flags,
            ...(payload.published !== undefined ? { published: payload.published } : {}),
          },
        });
        targetId = saved.id;
        break;
      }
      const saved = await prisma.pastPaper.create({
        data: {
          catalogKey,
          subject: listing!.subject,
          board: listing!.board,
          year: listing!.year,
          paperType: listing!.paperType,
          title: listing!.title,
          fileUrl: payload.fileUrl || null,
          ...pastPaperVisibility(payload.published !== false, payload.published !== false),
        },
      });
      targetId = saved.id;
      break;
    }
    case "past_paper_delete": {
      const id = needId(payload.id);
      targetType = "PastPaper";
      targetId = id;
      await prisma.pastPaper.delete({ where: { id } });
      break;
    }
    case "send_recovery_email_1": {
      if (!payload.confirmSend) {
        throw new AdminActionError("confirmSend is required to send Recovery Email 1", 400);
      }
      targetType = "RecoveryCampaign";
      targetId = "tutor_profile_r1";
      const summary = await sendRecoveryEmail1Campaign();
      extra = summary;
      break;
    }
    default:
      throw new AdminActionError(`Unknown action: ${action}`);
  }

  await writeAdminAudit({
    adminId,
    action,
    targetType,
    targetId,
    detail: Object.keys(extra).length ? JSON.stringify({ action, ...extra }) : detailOf(payload),
  });

  return { ok: true as const, action, targetType, targetId, ...extra };
}

export { AdminActionError, COMPANY_ADMIN_EMAIL };
