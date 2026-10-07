export const USER_STATUS = Object.freeze({ INVITED: 'invited', ACTIVE: 'active', DISABLED: 'disabled' });
export const PROFILE_STATUS = Object.freeze({ DRAFT: 'draft', PENDING_REVIEW: 'pending_review', CHANGES_REQUESTED: 'changes_requested', APPROVED: 'approved', PUBLISHED: 'published', REJECTED: 'rejected' });
export const SUBMISSION_LINK_STATUS = Object.freeze({ ACTIVE: 'active', EXPIRED: 'expired', REVOKED: 'revoked' });
export const MENTOR_STATUS = Object.freeze({ NEW: 'new', UNDER_REVIEW: 'under_review', APPROVED: 'approved', DECLINED: 'declined' });
export const NEWSLETTER_STATUS = Object.freeze({ DRAFT: 'draft', SCHEDULED: 'scheduled', SENDING: 'sending', SENT: 'sent', FAILED: 'failed' });

export const formatStatusLabel = (status = '') => status.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
