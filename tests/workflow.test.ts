import { describe, it, expect } from 'vitest';
import {
  canTransitionWorkflow,
  VALID_WORKFLOW_TRANSITIONS,
  ExamWorkflowStatus,
} from '../src/types/workflow';

describe('Exam Workflow State Machine (SPEC 9.2)', () => {
  it('allows valid sequential forward transitions in primary flow', () => {
    // DRAFT -> READY
    expect(canTransitionWorkflow('DRAFT', 'READY')).toBe(true);

    // READY -> SUBMITTED_LOCKED
    expect(canTransitionWorkflow('READY', 'SUBMITTED_LOCKED')).toBe(true);

    // SUBMITTED_LOCKED -> CROSS_REVIEW
    expect(canTransitionWorkflow('SUBMITTED_LOCKED', 'CROSS_REVIEW')).toBe(true);

    // CROSS_REVIEW -> REVIEWED
    expect(canTransitionWorkflow('CROSS_REVIEW', 'REVIEWED')).toBe(true);

    // REVIEWED -> SHORTLISTED (Tổ trưởng chọn 3 đề)
    expect(canTransitionWorkflow('REVIEWED', 'SHORTLISTED')).toBe(true);

    // SHORTLISTED -> TEAM_REVIEW (Góp ý tập thể)
    expect(canTransitionWorkflow('SHORTLISTED', 'TEAM_REVIEW')).toBe(true);

    // TEAM_REVIEW -> PRINCIPAL_REVIEW (Trình BGH duyệt)
    expect(canTransitionWorkflow('TEAM_REVIEW', 'PRINCIPAL_REVIEW')).toBe(true);

    // PRINCIPAL_REVIEW -> APPROVED (BGH duyệt)
    expect(canTransitionWorkflow('PRINCIPAL_REVIEW', 'APPROVED')).toBe(true);

    // APPROVED -> PUBLISHED
    expect(canTransitionWorkflow('APPROVED', 'PUBLISHED')).toBe(true);

    // PUBLISHED -> ARCHIVED
    expect(canTransitionWorkflow('PUBLISHED', 'ARCHIVED')).toBe(true);
  });

  it('allows valid revision and return branch transitions', () => {
    // Ready can go back to draft for more edits
    expect(canTransitionWorkflow('READY', 'DRAFT')).toBe(true);

    // Locked or in review can be returned for revision
    expect(canTransitionWorkflow('SUBMITTED_LOCKED', 'RETURNED_FOR_REVISION')).toBe(true);
    expect(canTransitionWorkflow('CROSS_REVIEW', 'RETURNED_FOR_REVISION')).toBe(true);
    expect(canTransitionWorkflow('REVIEWED', 'RETURNED_FOR_REVISION')).toBe(true);
    expect(canTransitionWorkflow('TEAM_REVIEW', 'RETURNED_FOR_REVISION')).toBe(true);
    expect(canTransitionWorkflow('PRINCIPAL_REVIEW', 'RETURNED_FOR_REVISION')).toBe(true);

    // Teacher receives return for revision and edits draft or marks ready
    expect(canTransitionWorkflow('RETURNED_FOR_REVISION', 'DRAFT')).toBe(true);
    expect(canTransitionWorkflow('RETURNED_FOR_REVISION', 'READY')).toBe(true);

    // Rejection branches
    expect(canTransitionWorkflow('REVIEWED', 'REJECTED')).toBe(true);
    expect(canTransitionWorkflow('SHORTLISTED', 'REJECTED')).toBe(true);
    expect(canTransitionWorkflow('PRINCIPAL_REVIEW', 'REJECTED')).toBe(true);
    expect(canTransitionWorkflow('REJECTED', 'ARCHIVED')).toBe(true);

    // Superseded branch
    expect(canTransitionWorkflow('PUBLISHED', 'SUPERSEDED')).toBe(true);
    expect(canTransitionWorkflow('ARCHIVED', 'SUPERSEDED')).toBe(true);
  });

  it('strictly blocks invalid transitions that bypass the workflow', () => {
    // Cannot jump from DRAFT straight to APPROVED or PUBLISHED
    expect(canTransitionWorkflow('DRAFT', 'APPROVED')).toBe(false);
    expect(canTransitionWorkflow('DRAFT', 'PUBLISHED')).toBe(false);
    expect(canTransitionWorkflow('DRAFT', 'SUBMITTED_LOCKED')).toBe(false);

    // Cannot bypass SHORTLISTED (Tổ trưởng chọn)
    expect(canTransitionWorkflow('CROSS_REVIEW', 'APPROVED')).toBe(false);
    expect(canTransitionWorkflow('REVIEWED', 'PRINCIPAL_REVIEW')).toBe(false);

    // Cannot jump from REJECTED straight to APPROVED
    expect(canTransitionWorkflow('REJECTED', 'APPROVED')).toBe(false);

    // Terminal state SUPERSEDED cannot transition to anything
    expect(canTransitionWorkflow('SUPERSEDED', 'DRAFT')).toBe(false);
    expect(canTransitionWorkflow('SUPERSEDED', 'APPROVED')).toBe(false);
  });

  it('ensures every defined status has explicit transition rules', () => {
    const allStatuses = Object.keys(VALID_WORKFLOW_TRANSITIONS) as ExamWorkflowStatus[];
    expect(allStatuses.length).toBe(14); // 11 main + 3 branches
    for (const status of allStatuses) {
      expect(Array.isArray(VALID_WORKFLOW_TRANSITIONS[status])).toBe(true);
    }
  });
});
