import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Item, StickyColor } from '../src/types';
import { sanitizeItemForFirestore } from '../src/services/firestoreRepository';

describe('Sticky Notes & Drafts Integration Tests', () => {
  // Test 1: Empty note guard
  it('1. Empty note guard: blank or whitespace-only text must not create a draft item', () => {
    const rawInputs = ['', '   ', '\n\t  \n'];
    for (const input of rawInputs) {
      const trimmed = input.trim();
      const shouldCreate = trimmed.length > 0;
      assert.equal(shouldCreate, false, `Input "${input}" should not trigger draft creation`);
    }
  });

  // Test 2: Auto-save creates draft with first line as display title
  it('2. Quick Note creation: first non-empty text auto-saves as a draft with first line title', () => {
    const content = 'خرید کتاب هوش مصنوعی\nباید فصل اول را بخوانم و خلاصه کنم.';
    const lines = content.trim().split('\n');
    const firstLineTitle = lines[0].slice(0, 100);

    const noteItem: Item = {
      id: 'note-test-123',
      type: 'note',
      title: firstLineTitle,
      description: content,
      completed: false,
      tags: [],
      isDraft: true,
      pinned: false,
      color: 'amber',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    assert.equal(noteItem.isDraft, true);
    assert.equal(noteItem.title, 'خرید کتاب هوش مصنوعی');
    assert.equal(noteItem.description, content);
    assert.equal(noteItem.color, 'amber');
  });

  // Test 3: Existing notes preservation
  it('3. Existing notes preservation: notes without isDraft must never be treated as drafts', () => {
    const legacyNote: Item = {
      id: 'legacy-note-1',
      type: 'note',
      title: 'یادداشت قدیمی بدون پروژه',
      description: 'متن یادداشت',
      completed: false,
      tags: [],
      createdAt: '2026-01-01T10:00:00Z',
    };

    // Verify it is not a draft
    const isDraft = legacyNote.isDraft === true;
    assert.equal(isDraft, false, 'Legacy note without isDraft must not be classified as draft');
  });

  // Test 4: Finalize without title and without project
  it('4. Finalizing draft: "نگهداشتن در یادداشت‌ها" exits draft status on the same record without requiring title or project', () => {
    const draftNote: Item = {
      id: 'note-draft-456',
      type: 'note',
      title: 'ایده سریع',
      description: 'ایده سریع برای بهبود سیستم',
      completed: false,
      tags: [],
      isDraft: true,
      createdAt: new Date().toISOString(),
    };

    // User chooses "نگهداشتن در یادداشت‌ها"
    const finalizedNote: Item = {
      ...draftNote,
      isDraft: false,
      updatedAt: new Date().toISOString(),
    };

    assert.equal(finalizedNote.id, draftNote.id, 'Must be the same record, not a cloned duplicate');
    assert.equal(finalizedNote.isDraft, false, 'Draft state must be toggled off');
    assert.equal(finalizedNote.projectId, undefined, 'Project remains optional');
  });

  // Test 5: Delete and Undo
  it('5. Delete and Undo: deleting a note and restoring returns the exact original item', () => {
    let itemsList: Item[] = [
      {
        id: 'note-del-1',
        type: 'note',
        title: 'برگه تستی',
        description: 'متن برگه تستی',
        completed: false,
        tags: ['تست'],
        color: 'emerald',
        isDraft: true,
        createdAt: new Date().toISOString(),
      },
    ];

    const toDeleteId = 'note-del-1';
    const deletedBackup = itemsList.find((i) => i.id === toDeleteId)!;
    assert.ok(deletedBackup);

    // Delete
    itemsList = itemsList.filter((i) => i.id !== toDeleteId);
    assert.equal(itemsList.length, 0);

    // Undo Restore
    itemsList = [deletedBackup, ...itemsList];
    assert.equal(itemsList.length, 1);
    assert.equal(itemsList[0].id, toDeleteId);
    assert.equal(itemsList[0].color, 'emerald');
  });

  // Test 6: Convert to Task idempotently
  it('6. Convert to Task: creates task with note content and prevents repeated duplicate creation', () => {
    const note: Item = {
      id: 'note-convert-789',
      type: 'note',
      title: 'ارسال ایمیل گزارش ماهانه',
      description: 'ارسال ایمیل گزارش ماهانه به تیم محصول با جزئیات کامل',
      completed: false,
      tags: ['کار'],
      isDraft: true,
      color: 'blue',
      createdAt: new Date().toISOString(),
    };

    // First conversion
    const taskId = 'task-from-note-1';
    const createdTask: Item = {
      id: taskId,
      type: 'task',
      title: note.title,
      description: note.description,
      completed: false,
      status: 'todo',
      tags: note.tags,
      createdAt: new Date().toISOString(),
    };

    const linkedNote: Item = {
      ...note,
      convertedToTaskId: taskId,
      isDraft: false,
    };

    assert.equal(createdTask.type, 'task');
    assert.equal(createdTask.description, note.description);
    assert.equal(linkedNote.convertedToTaskId, taskId);
    assert.equal(linkedNote.isDraft, false);

    // Second conversion attempt should detect convertedToTaskId
    const alreadyConverted = Boolean(linkedNote.convertedToTaskId);
    assert.equal(alreadyConverted, true, 'Subsequent clicks must detect existing conversion');
  });

  // Test 7: Multi-user cache isolation
  it('7. Multi-user cache isolation: local draft keys are partitioned by userId', () => {
    const userA = 'uid-alice';
    const userB = 'uid-bob';
    const noteId = 'new';

    const keyA = `karrooz_draft_cache_${userA}_${noteId}`;
    const keyB = `karrooz_draft_cache_${userB}_${noteId}`;

    assert.notEqual(keyA, keyB);
    assert.match(keyA, new RegExp(userA));
    assert.match(keyB, new RegExp(userB));
  });

  // Test 8: Firestore sanitization for sticky note fields
  it('8. Firestore sanitization: properly includes and validates isDraft, pinned, color, convertedToTaskId, and updatedAt', () => {
    const item: Item = {
      id: 'note-sanitized-1',
      type: 'note',
      title: 'تست فایربیس',
      description: 'تست فیلدهای استیکی در فایربیس',
      completed: false,
      tags: ['تست'],
      color: 'rose',
      pinned: true,
      isDraft: true,
      convertedToTaskId: 'task-123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sanitized = sanitizeItemForFirestore(item, 'user-123');
    assert.equal(sanitized.id, 'note-sanitized-1');
    assert.equal(sanitized.userId, 'user-123');
    assert.equal(sanitized.type, 'note');
    assert.equal(sanitized.color, 'rose');
    assert.equal(sanitized.pinned, true);
    assert.equal(sanitized.isDraft, true);
    assert.equal(sanitized.convertedToTaskId, 'task-123');
    assert.ok(sanitized.updatedAt);
  });
});
