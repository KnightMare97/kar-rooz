import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Item, TaskStep, RecurrenceRule } from '../src/types';
import { expandSeriesOccurrences } from '../src/utils/recurrence';

describe('Task Checklist / Substeps Tests', () => {
  it('preserves task steps structure and completion status', () => {
    const steps: TaskStep[] = [
      { id: 's1', text: 'انتخاب موضوع', completed: true },
      { id: 's2', text: 'نوشتن پیش‌نویس', completed: true },
      { id: 's3', text: 'آماده‌کردن تصویر', completed: false },
      { id: 's4', text: 'انتشار نهایی', completed: false },
    ];

    const task: Item = {
      id: 'task-1',
      title: 'انتشار پست وبلاگ',
      type: 'task',
      status: 'in_progress',
      completed: false,
      tags: [],
      steps,
      createdAt: '2026-11-11T10:00:00.000Z',
    };

    assert.equal(task.steps?.length, 4);
    const completedCount = task.steps?.filter((s) => s.completed).length;
    assert.equal(completedCount, 2);
    const openCount = task.steps?.filter((s) => !s.completed).length;
    assert.equal(openCount, 2);
  });

  it('checking a step does not alter the parent task completion status', () => {
    const task: Item = {
      id: 'task-2',
      title: 'بررسی مدارک',
      type: 'task',
      completed: false,
      status: 'todo',
      tags: [],
      steps: [
        { id: 'step-1', text: 'مرحله اول', completed: false },
        { id: 'step-2', text: 'مرحله دوم', completed: false },
      ],
      createdAt: '2026-11-11T10:00:00.000Z',
    };

    // User checks step 1
    const updatedSteps = task.steps!.map((s, idx) => (idx === 0 ? { ...s, completed: true } : s));
    const updatedTask: Item = {
      ...task,
      steps: updatedSteps,
    };

    assert.equal(updatedTask.completed, false);
    assert.equal(updatedTask.status, 'todo');
    assert.equal(updatedTask.steps?.[0].completed, true);
    assert.equal(updatedTask.steps?.[1].completed, false);
  });

  it('reopening a completed task does not auto-clear step checkboxes', () => {
    const task: Item = {
      id: 'task-3',
      title: 'تسک تکمیل شده با مراحل',
      type: 'task',
      completed: true,
      status: 'done',
      tags: [],
      completedAt: '2026-11-11T11:00:00.000Z',
      steps: [
        { id: 's1', text: 'مرحله اول', completed: true },
        { id: 's2', text: 'مرحله دوم', completed: true },
        { id: 's3', text: 'مرحله سوم', completed: false },
      ],
      createdAt: '2026-11-11T10:00:00.000Z',
    };

    // User unchecks the task to reopen it
    const reopenedTask: Item = {
      ...task,
      completed: false,
      status: 'todo',
      completedAt: undefined,
      // steps must remain preserved!
    };

    assert.equal(reopenedTask.completed, false);
    assert.equal(reopenedTask.status, 'todo');
    assert.equal(reopenedTask.steps?.length, 3);
    assert.equal(reopenedTask.steps?.[0].completed, true);
    assert.equal(reopenedTask.steps?.[1].completed, true);
    assert.equal(reopenedTask.steps?.[2].completed, false);
  });

  it('completing task with choice 1 (complete all) marks all steps completed', () => {
    const task: Item = {
      id: 'task-4',
      title: 'خرید تجهیزات',
      type: 'task',
      completed: false,
      status: 'todo',
      tags: [],
      steps: [
        { id: 's1', text: 'کابل HDMI', completed: true },
        { id: 's2', text: 'میکروفون', completed: false },
      ],
      createdAt: '2026-11-11T10:00:00.000Z',
    };

    // User chooses: «تسک و همهٔ مراحل انجام شدند»
    const completedAllTask: Item = {
      ...task,
      completed: true,
      status: 'done',
      completedAt: '2026-11-11T12:00:00.000Z',
      steps: task.steps!.map((s) => ({ ...s, completed: true })),
    };

    assert.equal(completedAllTask.completed, true);
    assert.equal(completedAllTask.status, 'done');
    assert.ok(completedAllTask.steps?.every((s) => s.completed));
  });

  it('completing task with choice 2 (task only) keeps uncompleted steps open', () => {
    const task: Item = {
      id: 'task-5',
      title: 'آماده‌سازی گزارش',
      type: 'task',
      completed: false,
      status: 'todo',
      tags: [],
      steps: [
        { id: 's1', text: 'جمع‌آوری آمار', completed: true },
        { id: 's2', text: 'ضمیمه فرم‌ها', completed: false },
      ],
      createdAt: '2026-11-11T10:00:00.000Z',
    };

    // User chooses: «فقط خود تسک انجام شد»
    const completedTaskOnly: Item = {
      ...task,
      completed: true,
      status: 'done',
      completedAt: '2026-11-11T12:00:00.000Z',
    };

    assert.equal(completedTaskOnly.completed, true);
    assert.equal(completedTaskOnly.steps?.[0].completed, true);
    assert.equal(completedTaskOnly.steps?.[1].completed, false);
  });

  it('recurring task expansion: each new occurrence starts with independent, uncompleted step states', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      calendarBasis: 'jalali',
      endType: 'never',
    };

    const seriesItem: Item = {
      id: 'series-daily',
      title: 'بررسی روزانه سیستم',
      type: 'task',
      completed: false,
      tags: [],
      plannedDate: '2026-11-10',
      recurrence: rule,
      steps: [
        { id: 's1', text: 'چک دیتابیس', completed: false },
        { id: 's2', text: 'چک لاگ‌ها', completed: false },
      ],
      createdAt: '2026-11-10T08:00:00.000Z',
      occurrenceOverrides: {
        '2026-11-10': {
          completed: true,
          status: 'done',
          steps: [
            { id: 's1', text: 'چک دیتابیس', completed: true },
            { id: 's2', text: 'چک لاگ‌ها', completed: true },
          ],
        },
      },
    };

    // Expand series for a window including 2026-11-10 and 2026-11-11
    const occurrences = expandSeriesOccurrences(seriesItem, '2026-11-10', '2026-11-12');

    const occ1 = occurrences.find((o) => o.originalScheduledDate === '2026-11-10');
    const occ2 = occurrences.find((o) => o.originalScheduledDate === '2026-11-11');

    assert.ok(occ1);
    assert.ok(occ2);

    // Day 1 has overridden completed steps
    assert.equal(occ1.completed, true);
    assert.equal(occ1.steps?.[0].completed, true);
    assert.equal(occ1.steps?.[1].completed, true);

    // Day 2 (new occurrence) starts uncompleted with uncompleted steps!
    assert.equal(occ2.completed, false);
    assert.equal(occ2.steps?.[0].completed, false);
    assert.equal(occ2.steps?.[1].completed, false);
  });

  it('switching type from task to note and back preserves step data', () => {
    const task: Item = {
      id: 'item-convert',
      title: 'برنامه‌ریزی سمینار',
      type: 'task',
      completed: false,
      tags: [],
      steps: [
        { id: 's1', text: 'رزرو سالن', completed: true },
        { id: 's2', text: 'پذیرایی', completed: false },
      ],
      createdAt: '2026-11-11T10:00:00.000Z',
    };

    // Switched to note
    const note: Item = {
      ...task,
      type: 'note',
      // steps remain intact on data record
    };

    assert.equal(note.type, 'note');
    assert.equal(note.steps?.length, 2);

    // Switched back to task
    const restoredTask: Item = {
      ...note,
      type: 'task',
    };

    assert.equal(restoredTask.type, 'task');
    assert.equal(restoredTask.steps?.length, 2);
    assert.equal(restoredTask.steps?.[0].text, 'رزرو سالن');
    assert.equal(restoredTask.steps?.[0].completed, true);
    assert.equal(restoredTask.steps?.[1].text, 'پذیرایی');
    assert.equal(restoredTask.steps?.[1].completed, false);
  });

  it('JSON backup serialization and parsing preserves steps', () => {
    const items: Item[] = [
      {
        id: 'backup-task-1',
        title: 'تسک با چک‌لیست',
        type: 'task',
        completed: false,
        tags: [],
        steps: [
          { id: 'step-a', text: 'قدم اول', completed: true },
          { id: 'step-b', text: 'قدم دوم', completed: false },
        ],
        createdAt: '2026-11-11T10:00:00.000Z',
      },
    ];

    const json = JSON.stringify({ version: 2, items });
    const parsed = JSON.parse(json);

    assert.ok(Array.isArray(parsed.items));
    assert.equal(parsed.items[0].steps.length, 2);
    assert.equal(parsed.items[0].steps[0].text, 'قدم اول');
    assert.equal(parsed.items[0].steps[0].completed, true);
    assert.equal(parsed.items[0].steps[1].text, 'قدم دوم');
    assert.equal(parsed.items[0].steps[1].completed, false);
  });
});
