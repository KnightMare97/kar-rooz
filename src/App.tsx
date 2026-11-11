/**
 * KarRooz (کار روز) - Personal Task, Note & Project Manager
 * Calm, focused, RTL Persian productivity tool.
 * Shared Firestore Persistence with Owner-Only Isolation and Safe Local Migration.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Item,
  Project,
  FilterType,
  ActiveView,
  KanbanStatus,
  WorkViewTab,
  TaskStep,
  UNASSIGNED_PROJECT_ID,
} from './types';
import {
  loadItems,
  saveItems,
  loadProjects,
  saveProjects,
  loadSimpleMode,
  saveSimpleMode,
  loadAllWorkTab,
  saveAllWorkTab,
  loadProjectTab,
  saveProjectTab,
  loadAllWorkProjectFilters,
  saveAllWorkProjectFilters,
  loadAllWorkShowArchived,
  saveAllWorkShowArchived,
} from './services/storage';
import { getTehranTodayDateString, formatJalaliDate, toPersianDigits, addDays } from './utils/date';
import { expandAllItems } from './utils/recurrence';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { QuickCapture } from './components/QuickCapture';
import { TodaySections } from './components/TodaySections';
import { AllWorkView } from './components/AllWorkView';
import { NotesView } from './components/NotesView';
import { ItemEditorModal } from './components/ItemEditorModal';
import { SeriesModal } from './components/SeriesModal';
import { MobileNav } from './components/MobileNav';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectModal } from './components/ProjectModal';
import { BackupModal } from './components/BackupModal';
import { AuthModal } from './components/AuthModal';
import { MigrationModal } from './components/MigrationModal';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { CompleteTaskConfirmModal } from './components/CompleteTaskConfirmModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import {
  subscribeToUserItems,
  subscribeToUserProjects,
  saveFirestoreItem,
  deleteFirestoreItem,
  saveFirestoreProject,
  deleteFirestoreProject,
  fetchCloudStatus,
  migrateLocalDataToFirestore,
  CollisionResolution,
  MigrationResult,
} from './services/firestoreRepository';
import { AlertCircle, Cloud, RefreshCw, X } from 'lucide-react';

interface MigrationModalState {
  isOpen: boolean;
  localItems: Item[];
  localProjects: Project[];
  cloudItemsCount: number;
  cloudProjectsCount: number;
  collidingCount: number;
}

function AppContent() {
  const {
    user,
    syncStatus,
    setSyncStatus,
    hasPendingWrites,
    setHasPendingWrites,
    syncError,
    setSyncError,
  } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('today');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Timezone-aware date tracking (Asia/Tehran)
  const [todayDate, setTodayDate] = useState<string>(() => getTehranTodayDateString());

  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(() => loadSimpleMode());
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Unified Work Views Tab State
  const [allWorkTab, setAllWorkTab] = useState<WorkViewTab>(() => loadAllWorkTab());
  const [projectTab, setProjectTab] = useState<WorkViewTab>(() => loadProjectTab());

  // All Work Scope & Filters
  const [allWorkProjectFilters, setAllWorkProjectFilters] = useState<string[] | null>(() =>
    loadAllWorkProjectFilters(projects.map((p) => p.id))
  );
  const [allWorkShowArchived, setAllWorkShowArchived] = useState<boolean>(() =>
    loadAllWorkShowArchived()
  );
  const [allWorkSearchQuery, setAllWorkSearchQuery] = useState('');

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Modals
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [migrationModalState, setMigrationModalState] = useState<MigrationModalState | null>(null);
  const [selectedSeriesModalId, setSelectedSeriesModalId] = useState<string | null>(null);
  const [skipConfirmOccurrence, setSkipConfirmOccurrence] = useState<Item | null>(null);
  const [undoSkipInfo, setUndoSkipInfo] = useState<{ seriesId: string; originalDate: string; title: string } | null>(null);
  const [completeConfirmTarget, setCompleteConfirmTarget] = useState<{
    id: string;
    title: string;
    steps: TaskStep[];
    isOccurrence: boolean;
    seriesId?: string;
    origDate?: string;
  } | null>(null);

  const captureSectionRef = useRef<HTMLDivElement>(null);

  // Recalculate today on app focus and day rollover
  useEffect(() => {
    const handleCheckDate = () => {
      const currentTehranDate = getTehranTodayDateString();
      setTodayDate((prev) => (prev !== currentTehranDate ? currentTehranDate : prev));
    };

    window.addEventListener('focus', handleCheckDate);
    const interval = setInterval(handleCheckDate, 30000); // Check every 30s

    return () => {
      window.removeEventListener('focus', handleCheckDate);
      clearInterval(interval);
    };
  }, []);

  // Keep pre-existing local storage intact; do not auto-wipe or overwrite with empty state
  useEffect(() => {
    if (!user) {
      setItems([]);
      setProjects([]);
      setSyncStatus('local');
      setHasPendingWrites(false);
      setSyncError(null);
      setMigrationModalState(null);
      return;
    }

    setSyncStatus('loading');
    setSyncError(null);

    // 1. Subscribe to User Items
    const unsubItems = subscribeToUserItems(
      user.uid,
      (cloudItems, meta) => {
        setItems(cloudItems);
        setHasPendingWrites(meta.hasPendingWrites);
        setSyncStatus(meta.hasPendingWrites ? 'syncing' : 'synced');
      },
      (err) => {
        console.error('Firestore items error:', err);
        setSyncStatus('error');
        setSyncError(err.message || 'خطا در ارتباط با سرور فایربیس');
      }
    );

    // 2. Subscribe to User Projects
    const unsubProjects = subscribeToUserProjects(
      user.uid,
      (cloudProjects, meta) => {
        setProjects(cloudProjects);
        setHasPendingWrites(meta.hasPendingWrites);
      },
      (err) => {
        console.error('Firestore projects error:', err);
        setSyncStatus('error');
        setSyncError(err.message || 'خطا در ارتباط با سرور فایربیس');
      }
    );

    // 3. Inspect if guest data migration prompt is needed
    const checkMigration = async () => {
      const localGuestItems = loadItems();
      const localGuestProjects = loadProjects();
      const alreadyDecided = localStorage.getItem(`karrooz_migration_decided_${user.uid}`);

      // If user previously completed or dismissed migration, or has no local guest data, skip
      if (alreadyDecided || (localGuestItems.length === 0 && localGuestProjects.length === 0)) {
        return;
      }

      try {
        const cloudStatus = await fetchCloudStatus(user.uid);
        const collidingItems = localGuestItems.filter((i) => cloudStatus.cloudItemIds.has(i.id)).length;
        const collidingProjects = localGuestProjects.filter((p) => cloudStatus.cloudProjectIds.has(p.id)).length;

        setMigrationModalState({
          isOpen: true,
          localItems: localGuestItems,
          localProjects: localGuestProjects,
          cloudItemsCount: cloudStatus.itemsCount,
          cloudProjectsCount: cloudStatus.projectsCount,
          collidingCount: collidingItems + collidingProjects,
        });
      } catch (err) {
        console.warn('Could not inspect cloud status for migration:', err);
      }
    };

    checkMigration();

    return () => {
      unsubItems();
      unsubProjects();
    };
  }, [user]);

  const handleToggleSimpleMode = () => {
    const next = !isSimpleMode;
    setIsSimpleMode(next);
    saveSimpleMode(next);
  };

  const handleAllWorkTabChange = (tab: WorkViewTab) => {
    setAllWorkTab(tab);
    saveAllWorkTab(tab);
  };

  const handleProjectTabChange = (tab: WorkViewTab) => {
    setProjectTab(tab);
    saveProjectTab(tab);
  };

  const handleAllWorkProjectFiltersChange = (filters: string[] | null) => {
    setAllWorkProjectFilters(filters);
    saveAllWorkProjectFilters(filters);
  };

  const handleAllWorkShowArchivedChange = (show: boolean) => {
    setAllWorkShowArchived(show);
    saveAllWorkShowArchived(show);
  };

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 5000);
  };

  const handleNavigate = (view: ActiveView, newFilter?: FilterType) => {
    setActiveView(view);
    if (newFilter) {
      setFilter(newFilter);
    }
    if (view !== 'project-detail') {
      setSelectedProjectId(null);
    }
  };

  const generateId = (prefix = 'item'): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  // Item Handlers
  const handleAddItem = (newItemData: Omit<Item, 'id' | 'createdAt'>) => {
    const isTask = newItemData.type === 'task';
    const newItem: Item = {
      ...newItemData,
      id: generateId('item'),
      status: isTask ? (newItemData.status || (newItemData.completed ? 'done' : 'todo')) : undefined,
      createdAt: new Date().toISOString(),
    };

    setItems((prev) => [newItem, ...prev]);

    // Authenticated cloud write
    if (user) {
      setSyncStatus('syncing');
      saveFirestoreItem(user.uid, newItem).catch((err) => {
        console.error('Error adding item to Firestore:', err);
        setSyncStatus('error');
        showToast('خطا در ذخیره وظیفه در سرور ابری.');
      });
    }

    // Check if new item leaves active All Work filter
    if (activeView === 'all-work' && allWorkProjectFilters !== null) {
      const itemKey = newItem.projectId || UNASSIGNED_PROJECT_ID;
      if (!allWorkProjectFilters.includes(itemKey)) {
        showToast('مورد جدید ذخیره شد، اما با توجه به فیلتر پروژه‌های انتخابی در این نما پنهان است.');
      }
    }
  };

  const handleToggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if this is an occurrence ID (seriesId__originalDate)
    if (id.includes('__')) {
      const [seriesId, origDate] = id.split('__');
      const parent = items.find((i) => i.id === seriesId);
      if (!parent) return;

      const currentOverride = parent.occurrenceOverrides?.[origDate];
      const isCurrentlyCompleted = Boolean(currentOverride?.completed ?? parent.completed);
      const nextCompleted = !isCurrentlyCompleted;

      // If user is completing the task, check for open steps
      if (nextCompleted) {
        const steps = currentOverride?.steps ?? parent.steps;
        const openSteps = steps?.filter((s) => s.text.trim().length > 0 && !s.completed);
        if (steps && openSteps && openSteps.length > 0) {
          setCompleteConfirmTarget({
            id,
            title: currentOverride?.title || parent.title,
            steps,
            isOccurrence: true,
            seriesId,
            origDate,
          });
          return;
        }
      }

      const nextStatus: KanbanStatus = nextCompleted ? 'done' : 'todo';
      const updatedItem: Item = {
        ...parent,
        occurrenceOverrides: {
          ...(parent.occurrenceOverrides || {}),
          [origDate]: {
            ...(currentOverride || {}),
            completed: nextCompleted,
            status: nextStatus,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          },
        },
      };

      if (user) {
        setSyncStatus('syncing');
        saveFirestoreItem(user.uid, updatedItem).catch((err) => {
          console.error('Firestore save error:', err);
          setSyncStatus('error');
        });
      }

      setItems((prev) => prev.map((item) => (item.id === seriesId ? updatedItem : item)));
      return;
    }

    const task = items.find((i) => i.id === id);
    if (!task || task.type !== 'task') return;

    const nextCompleted = !task.completed;

    // If user is completing the task, check for open steps
    if (nextCompleted) {
      const openSteps = task.steps?.filter((s) => s.text.trim().length > 0 && !s.completed);
      if (task.steps && openSteps && openSteps.length > 0) {
        setCompleteConfirmTarget({
          id,
          title: task.title,
          steps: task.steps,
          isOccurrence: false,
        });
        return;
      }
    }

    const nextStatus: KanbanStatus = nextCompleted ? 'done' : 'todo';
    const updatedItem: Item = {
      ...task,
      completed: nextCompleted,
      status: nextStatus,
      completedAt: nextCompleted ? new Date().toISOString() : undefined,
    };

    if (user) {
      setSyncStatus('syncing');
      saveFirestoreItem(user.uid, updatedItem).catch((err) => {
        console.error('Firestore save error:', err);
        setSyncStatus('error');
      });
    }

    setItems((prev) => prev.map((item) => (item.id === id ? updatedItem : item)));
  };

  const handleConfirmCompleteAll = () => {
    if (!completeConfirmTarget) return;

    const allDoneSteps = completeConfirmTarget.steps.map((s) => ({ ...s, completed: true }));

    if (completeConfirmTarget.isOccurrence && completeConfirmTarget.seriesId && completeConfirmTarget.origDate) {
      const seriesId = completeConfirmTarget.seriesId;
      const origDate = completeConfirmTarget.origDate;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === seriesId) {
            const currentOverride = item.occurrenceOverrides?.[origDate] || {};
            const updatedItem: Item = {
              ...item,
              occurrenceOverrides: {
                ...(item.occurrenceOverrides || {}),
                [origDate]: {
                  ...currentOverride,
                  completed: true,
                  status: 'done',
                  completedAt: new Date().toISOString(),
                  steps: allDoneSteps,
                },
              },
            };

            if (user) {
              setSyncStatus('syncing');
              saveFirestoreItem(user.uid, updatedItem).catch((err) => {
                console.error('Firestore save error:', err);
                setSyncStatus('error');
              });
            }

            return updatedItem;
          }
          return item;
        })
      );
    } else {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === completeConfirmTarget.id) {
            const updatedItem: Item = {
              ...item,
              completed: true,
              status: 'done',
              completedAt: new Date().toISOString(),
              steps: allDoneSteps,
            };

            if (user) {
              setSyncStatus('syncing');
              saveFirestoreItem(user.uid, updatedItem).catch((err) => {
                console.error('Firestore save error:', err);
                setSyncStatus('error');
              });
            }

            return updatedItem;
          }
          return item;
        })
      );
    }

    setCompleteConfirmTarget(null);
  };

  const handleConfirmCompleteTaskOnly = () => {
    if (!completeConfirmTarget) return;

    if (completeConfirmTarget.isOccurrence && completeConfirmTarget.seriesId && completeConfirmTarget.origDate) {
      const seriesId = completeConfirmTarget.seriesId;
      const origDate = completeConfirmTarget.origDate;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === seriesId) {
            const currentOverride = item.occurrenceOverrides?.[origDate] || {};
            const updatedItem: Item = {
              ...item,
              occurrenceOverrides: {
                ...(item.occurrenceOverrides || {}),
                [origDate]: {
                  ...currentOverride,
                  completed: true,
                  status: 'done',
                  completedAt: new Date().toISOString(),
                },
              },
            };

            if (user) {
              setSyncStatus('syncing');
              saveFirestoreItem(user.uid, updatedItem).catch((err) => {
                console.error('Firestore save error:', err);
                setSyncStatus('error');
              });
            }

            return updatedItem;
          }
          return item;
        })
      );
    } else {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === completeConfirmTarget.id) {
            const updatedItem: Item = {
              ...item,
              completed: true,
              status: 'done',
              completedAt: new Date().toISOString(),
            };

            if (user) {
              setSyncStatus('syncing');
              saveFirestoreItem(user.uid, updatedItem).catch((err) => {
                console.error('Firestore save error:', err);
                setSyncStatus('error');
              });
            }

            return updatedItem;
          }
          return item;
        })
      );
    }

    setCompleteConfirmTarget(null);
  };

  const handleSaveItem = (updatedItem: Item) => {
    // If saving an individual occurrence
    if (updatedItem.isRecurringOccurrence && updatedItem.recurringSeriesId && updatedItem.originalScheduledDate) {
      const seriesId = updatedItem.recurringSeriesId;
      const origDate = updatedItem.originalScheduledDate;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === seriesId) {
            const currentOverride = item.occurrenceOverrides?.[origDate] || {};
            const parentWithOverride: Item = {
              ...item,
              occurrenceOverrides: {
                ...(item.occurrenceOverrides || {}),
                [origDate]: {
                  ...currentOverride,
                  title: updatedItem.title,
                  description: updatedItem.description,
                  completed: updatedItem.completed,
                  status: updatedItem.status,
                  completedAt: updatedItem.completedAt,
                  plannedDate: updatedItem.plannedDate,
                  dueDate: updatedItem.dueDate,
                  projectId: updatedItem.projectId,
                  tags: updatedItem.tags,
                  steps: updatedItem.steps,
                },
              },
            };

            if (user) {
              setSyncStatus('syncing');
              saveFirestoreItem(user.uid, parentWithOverride).catch((err) => {
                console.error('Firestore save error:', err);
                setSyncStatus('error');
              });
            }

            return parentWithOverride;
          }
          return item;
        })
      );
      showToast('تغییرات فقط برای همین نوبت ذخیره شد.');
      return;
    }

    // Normal item or recurring series parent
    setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));

    if (user) {
      setSyncStatus('syncing');
      saveFirestoreItem(user.uid, updatedItem).catch((err) => {
        console.error('Firestore save error:', err);
        setSyncStatus('error');
        showToast('خطا در ذخیره تغییرات در سرور ابری.');
      });
    }

    // Check if item left active All Work filter
    if (activeView === 'all-work' && allWorkProjectFilters !== null) {
      const itemKey = updatedItem.projectId || UNASSIGNED_PROJECT_ID;
      if (!allWorkProjectFilters.includes(itemKey)) {
        showToast('مورد ویرایش‌شده خارج از فیلترهای فعال فعلی قرار دارد و با موفقیت ذخیره شد.');
      }
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (itemId.includes('__')) {
      const [seriesId, origDate] = itemId.split('__');
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === seriesId) {
            const currentOverride = item.occurrenceOverrides?.[origDate] || {};
            const updatedItem: Item = {
              ...item,
              occurrenceOverrides: {
                ...(item.occurrenceOverrides || {}),
                [origDate]: {
                  ...currentOverride,
                  skipped: true,
                },
              },
            };

            if (user) {
              setSyncStatus('syncing');
              saveFirestoreItem(user.uid, updatedItem).catch((err) => {
                console.error('Firestore save error:', err);
              });
            }

            return updatedItem;
          }
          return item;
        })
      );
      showToast('نوبت نادیده گرفته شد و از لیست حذف گردید.');
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== itemId));

    if (user) {
      setSyncStatus('syncing');
      deleteFirestoreItem(user.uid, itemId).catch((err) => {
        console.error('Firestore delete error:', err);
        setSyncStatus('error');
        showToast('خطا در حذف از سرور ابری.');
      });
    }
  };

  const handleRequestSkipOccurrence = (item: Item, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSkipConfirmOccurrence(item);
  };

  const handleConfirmSkipOccurrence = () => {
    if (!skipConfirmOccurrence) return;
    const seriesId = skipConfirmOccurrence.recurringSeriesId || skipConfirmOccurrence.id.split('__')[0];
    const origDate = skipConfirmOccurrence.originalScheduledDate || skipConfirmOccurrence.id.split('__')[1];
    const itemTitle = skipConfirmOccurrence.title;

    if (seriesId && origDate) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === seriesId) {
            const currentOverride = item.occurrenceOverrides?.[origDate] || {};
            const updatedItem: Item = {
              ...item,
              occurrenceOverrides: {
                ...(item.occurrenceOverrides || {}),
                [origDate]: {
                  ...currentOverride,
                  skipped: true,
                },
              },
            };

            if (user) {
              setSyncStatus('syncing');
              saveFirestoreItem(user.uid, updatedItem).catch((err) => {
                console.error('Firestore save error:', err);
              });
            }

            return updatedItem;
          }
          return item;
        })
      );
      setUndoSkipInfo({ seriesId, originalDate: origDate, title: itemTitle });
      showToast(`نوبت «${itemTitle}» نادیده گرفته شد.`);
    }
    setSkipConfirmOccurrence(null);
  };

  const handleUndoSkip = () => {
    if (!undoSkipInfo) return;
    const { seriesId, originalDate, title } = undoSkipInfo;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === seriesId && item.occurrenceOverrides?.[originalDate]) {
          const nextOverrides = { ...item.occurrenceOverrides };
          const cur = { ...nextOverrides[originalDate] };
          delete cur.skipped;
          if (Object.keys(cur).length === 0) {
            delete nextOverrides[originalDate];
          } else {
            nextOverrides[originalDate] = cur;
          }
          const updatedItem: Item = {
            ...item,
            occurrenceOverrides: nextOverrides,
          };

          if (user) {
            setSyncStatus('syncing');
            saveFirestoreItem(user.uid, updatedItem).catch((err) => {
              console.error('Firestore save error:', err);
            });
          }

          return updatedItem;
        }
        return item;
      })
    );
    setUndoSkipInfo(null);
    showToast(`نوبت «${title}» بازگردانی شد.`);
  };

  const handleStopSeries = (seriesId: string, cutoffDate: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === seriesId && item.recurrence) {
          const updatedItem: Item = {
            ...item,
            recurrence: {
              ...item.recurrence,
              stoppedAt: cutoffDate,
            },
          };

          if (user) {
            setSyncStatus('syncing');
            saveFirestoreItem(user.uid, updatedItem).catch((err) => {
              console.error('Firestore save error:', err);
            });
          }

          return updatedItem;
        }
        return item;
      })
    );
    showToast('تکرارهای آینده این کار از تاریخ انتخابی متوقف شد.');
  };

  const handleRestoreOccurrenceInModal = (seriesId: string, originalDate: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === seriesId && item.occurrenceOverrides?.[originalDate]) {
          const nextOverrides = { ...item.occurrenceOverrides };
          const cur = { ...nextOverrides[originalDate] };
          delete cur.skipped;
          if (Object.keys(cur).length === 0) {
            delete nextOverrides[originalDate];
          } else {
            nextOverrides[originalDate] = cur;
          }
          const updatedItem: Item = {
            ...item,
            occurrenceOverrides: nextOverrides,
          };

          if (user) {
            setSyncStatus('syncing');
            saveFirestoreItem(user.uid, updatedItem).catch((err) => {
              console.error('Firestore save error:', err);
            });
          }

          return updatedItem;
        }
        return item;
      })
    );
    showToast('نوبت با موفقیت بازگردانی شد.');
  };

  const handleMoveToToday = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: Item = {
      ...item,
      plannedDate: todayDate,
      inToday: true,
    };
    handleSaveItem(updated);
  };

  // Project Handlers
  const handleOpenCreateProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (project: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (projectData: { name: string; description?: string; color: string }) => {
    if (editingProject) {
      const updated: Project = {
        ...editingProject,
        name: projectData.name,
        description: projectData.description,
        color: projectData.color,
      };
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

      if (user) {
        setSyncStatus('syncing');
        saveFirestoreProject(user.uid, updated).catch((err) => {
          console.error('Firestore project save error:', err);
          setSyncStatus('error');
        });
      }
    } else {
      const newProject: Project = {
        id: generateId('proj'),
        name: projectData.name,
        description: projectData.description,
        color: projectData.color,
        createdAt: new Date().toISOString(),
        archived: false,
      };
      setProjects((prev) => [newProject, ...prev]);
      setSelectedProjectId(newProject.id);
      setActiveView('project-detail');

      if (user) {
        setSyncStatus('syncing');
        saveFirestoreProject(user.uid, newProject).catch((err) => {
          console.error('Firestore project save error:', err);
          setSyncStatus('error');
        });
      }
    }
  };

  const handleToggleArchiveProject = (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const nextArchived = !p.archived;
          const updated: Project = {
            ...p,
            archived: nextArchived,
            archivedAt: nextArchived ? new Date().toISOString() : undefined,
          };

          if (user) {
            setSyncStatus('syncing');
            saveFirestoreProject(user.uid, updated).catch((err) => {
              console.error('Firestore project archive error:', err);
              setSyncStatus('error');
            });
          }

          return updated;
        }
        return p;
      })
    );
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setActiveView('project-detail');
  };

  // Safe import JSON into active mode
  const handleImportData = (newItems: Item[], newProjects: Project[]): boolean => {
    try {
      setItems(newItems);
      setProjects(newProjects);
      if (!user) {
        saveItems(newItems);
        saveProjects(newProjects);
      } else {
        setSyncStatus('syncing');
        Promise.all([
          ...newProjects.map((p) => saveFirestoreProject(user.uid, p)),
          ...newItems.map((it) => saveFirestoreItem(user.uid, it)),
        ])
          .then(() => {
            setSyncStatus('synced');
            showToast('اطلاعات پشتیبان با موفقیت در حساب ابری بارگذاری شد.');
          })
          .catch((err) => {
            console.error('Error importing to cloud:', err);
            setSyncStatus('error');
            showToast('خطا در ذخیره‌سازی داده‌های وارد شده در سرور ابری.');
          });
      }
      return true;
    } catch (err) {
      console.error('Import error:', err);
      return false;
    }
  };

  // Migration Handlers
  const handleExecuteMigration = async (resolution: CollisionResolution): Promise<MigrationResult> => {
    if (!user) throw new Error('کاربر وارد نشده است.');
    const localGuestItems = loadItems();
    const localGuestProjects = loadProjects();

    // Preserve local snapshot safety backup
    try {
      localStorage.setItem(
        `karrooz_migration_backup_${Date.now()}`,
        JSON.stringify({ items: localGuestItems, projects: localGuestProjects, date: new Date().toISOString() })
      );
    } catch (e) {
      console.warn('Local backup snapshot error:', e);
    }

    const result = await migrateLocalDataToFirestore(user.uid, localGuestItems, localGuestProjects, resolution);
    if (result.success) {
      localStorage.setItem(`karrooz_migration_decided_${user.uid}`, 'migrated');
      showToast(`انتقال ${toPersianDigits(result.migratedItemsCount)} مورد با موفقیت به سرور ابری انجام شد.`);
    }
    return result;
  };

  const handleDismissMigration = () => {
    if (user) {
      localStorage.setItem(`karrooz_migration_decided_${user.uid}`, 'skipped');
    }
    setMigrationModalState(null);
    showToast('کار با حساب ابری بدون انتقال داده‌های محلی ادامه یافت.');
  };

  const handleOpenMigrationModalFromSettings = async () => {
    if (!user) return;
    const localGuestItems = loadItems();
    const localGuestProjects = loadProjects();
    try {
      const cloudStatus = await fetchCloudStatus(user.uid);
      const collidingItems = localGuestItems.filter((i) => cloudStatus.cloudItemIds.has(i.id)).length;
      const collidingProjects = localGuestProjects.filter((p) => cloudStatus.cloudProjectIds.has(p.id)).length;
      setMigrationModalState({
        isOpen: true,
        localItems: localGuestItems,
        localProjects: localGuestProjects,
        cloudItemsCount: cloudStatus.itemsCount,
        cloudProjectsCount: cloudStatus.projectsCount,
        collidingCount: collidingItems + collidingProjects,
      });
    } catch (err) {
      showToast('خطا در بررسی وضعیت داده‌های ابری.');
    }
  };

  // Expanded Items with recurring occurrences
  const expandedItems = useMemo(() => {
    return expandAllItems(items, addDays(todayDate, -60), addDays(todayDate, 90), {
      includeOverdueUnresolved: true,
      todayStr: todayDate,
    });
  }, [items, todayDate]);

  // Selected project resolution
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  // Today Section Collections
  const overdueDeadlines = useMemo(() => {
    return expandedItems.filter(
      (item) => item.type === 'task' && !item.completed && item.dueDate && item.dueDate < todayDate
    );
  }, [expandedItems, todayDate]);

  const overduePlanned = useMemo(() => {
    return expandedItems.filter(
      (item) =>
        item.type === 'task' &&
        !item.completed &&
        item.plannedDate &&
        item.plannedDate < todayDate &&
        (!item.dueDate || item.dueDate >= todayDate)
    );
  }, [expandedItems, todayDate]);

  const todayActiveItems = useMemo(() => {
    return expandedItems.filter(
      (item) =>
        !item.completed &&
        ((item.plannedDate && item.plannedDate === todayDate) ||
          (item.dueDate && item.dueDate === todayDate))
    );
  }, [expandedItems, todayDate]);

  const todayCompletedItems = useMemo(() => {
    return expandedItems.filter(
      (item) =>
        item.completed &&
        ((item.plannedDate && item.plannedDate === todayDate) ||
          (item.completedAt && item.completedAt.slice(0, 10) === todayDate))
    );
  }, [expandedItems, todayDate]);

  const todayActiveCount = todayActiveItems.length;
  const activeProjectsCount = useMemo(() => projects.filter((p) => !p.archived).length, [projects]);
  const totalNotesCount = useMemo(() => items.filter((i) => i.type === 'note').length, [items]);

  const handleOpenQuickCaptureFromMobile = () => {
    setActiveView('today');
    setTimeout(() => {
      captureSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      const inputEl = captureSectionRef.current?.querySelector('input');
      inputEl?.focus();
    }, 50);
  };

  return (
    <div className="min-h-screen bg-app text-app flex antialiased selection:bg-accent selection:text-white pb-20 md:pb-0">
      {/* Desktop Sidebar (RTL Right side) */}
      <Sidebar
        activeView={activeView}
        filter={filter}
        onNavigate={handleNavigate}
        isSimpleMode={isSimpleMode}
        onToggleSimpleMode={handleToggleSimpleMode}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        activeCount={todayActiveCount}
        allWorkCount={items.length}
        notesCount={totalNotesCount}
        projectsCount={activeProjectsCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header with Contextual Title / Breadcrumbs and Simple Mode Toggle */}
        <Header
          activeView={activeView}
          activeProject={selectedProject}
          onNavigateToProjects={() => handleNavigate('projects')}
          todayActiveCount={todayActiveCount}
          activeProjectsCount={activeProjectsCount}
          isSimpleMode={isSimpleMode}
          onToggleSimpleMode={handleToggleSimpleMode}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onNavigateToSettings={() => handleNavigate('settings')}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
          {/* VIEW 1: TODAY VIEW */}
          {activeView === 'today' && (
            <>
              {/* Separate Responsive Toolbar for Search & Filters */}
              <Toolbar
                filter={filter}
                onFilterChange={setFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              {/* Quick Capture Component */}
              <div ref={captureSectionRef}>
                <QuickCapture
                  projects={projects}
                  onAddItem={handleAddItem}
                  isSimpleMode={isSimpleMode}
                />
              </div>

              {/* Today Sections: Overdue Deadlines, Overdue Planned Tasks, Main Today Items, and Completed */}
              <TodaySections
                overdueDeadlines={overdueDeadlines}
                overduePlanned={overduePlanned}
                todayActiveItems={todayActiveItems}
                todayCompletedItems={todayCompletedItems}
                projects={projects}
                isSimpleMode={isSimpleMode}
                filter={filter}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
                onResetFilter={() => setFilter('all')}
                onToggleComplete={handleToggleComplete}
                onSelectItem={(item) => setEditingItem(item)}
                onMoveToToday={handleMoveToToday}
                onOpenSeriesModal={(seriesId) => setSelectedSeriesModalId(seriesId)}
                onSkipOccurrence={handleRequestSkipOccurrence}
              />
            </>
          )}

          {/* VIEW 2: ALL WORK (List / Kanban / Calendar) */}
          {activeView === 'all-work' && (
            <AllWorkView
              items={items}
              projects={projects}
              activeTab={allWorkTab}
              onTabChange={handleAllWorkTabChange}
              selectedProjectIds={allWorkProjectFilters}
              onProjectFilterChange={handleAllWorkProjectFiltersChange}
              showArchivedProjects={allWorkShowArchived}
              onShowArchivedProjectsChange={handleAllWorkShowArchivedChange}
              searchQuery={allWorkSearchQuery}
              onSearchQueryChange={setAllWorkSearchQuery}
              isSimpleMode={isSimpleMode}
              onAddItem={handleAddItem}
              onUpdateItem={handleSaveItem}
              onToggleComplete={handleToggleComplete}
              onSelectItem={(item) => setEditingItem(item)}
              onShowToast={showToast}
            />
          )}

          {/* VIEW 3: NOTES VIEW (Sticky Notes & Drafts) */}
          {activeView === 'notes' && (
            <NotesView
              items={items}
              projects={projects}
              isSimpleMode={isSimpleMode}
              onAddItem={handleAddItem}
              onUpdateItem={handleSaveItem}
              onDeleteItem={handleDeleteItem}
              onSelectItem={(item) => setEditingItem(item)}
              onShowToast={showToast}
            />
          )}

          {/* VIEW 4: PROJECTS LIST VIEW */}
          {activeView === 'projects' && (
            <ProjectList
              projects={projects}
              items={items}
              onSelectProject={handleSelectProject}
              onCreateProjectClick={handleOpenCreateProject}
              onEditProject={handleOpenEditProject}
              onToggleArchiveProject={handleToggleArchiveProject}
            />
          )}

          {/* VIEW 5: PROJECT DETAIL (List / Kanban / Calendar) */}
          {activeView === 'project-detail' && selectedProject && (
            <ProjectDetail
              project={selectedProject}
              items={items}
              projects={projects}
              viewMode={projectTab}
              onViewModeChange={handleProjectTabChange}
              isSimpleMode={isSimpleMode}
              onBack={() => setActiveView('projects')}
              onEditProject={handleOpenEditProject}
              onToggleArchiveProject={handleToggleArchiveProject}
              onAddItem={handleAddItem}
              onUpdateItem={handleSaveItem}
              onToggleComplete={handleToggleComplete}
              onSelectItem={(item) => setEditingItem(item)}
            />
          )}

          {/* VIEW 6: SETTINGS VIEW */}
          {activeView === 'settings' && (
            <SettingsView
              items={items}
              projects={projects}
              isSimpleMode={isSimpleMode}
              onToggleSimpleMode={handleToggleSimpleMode}
              onOpenBackupModal={() => setIsBackupModalOpen(true)}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpenMigrationModal={handleOpenMigrationModalFromSettings}
            />
          )}

          {/* Mobile Local / Cloud Storage Indicator */}
          <div className="md:hidden pt-3 pb-1 text-center text-[11px] text-gray-500 flex items-center justify-center gap-2">
            <span>{user ? (syncStatus === 'synced' ? 'همگام ابری' : 'ذخیره در سرور...') : 'ذخیره محلی'}</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsBackupModalOpen(true)}
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 cursor-pointer"
            >
              خروجی JSON
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
            >
              {user ? 'حساب کاربری' : 'ورود / فایربیس'}
            </button>
          </div>
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-[#1F202B] text-gray-200 text-xs rounded-xl shadow-2xl border border-violet-500/40 animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[90vw] sm:max-w-md select-none"
        >
          <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
          <span className="truncate flex-1">{toastMessage}</span>
          {undoSkipInfo && (
            <button
              type="button"
              onClick={handleUndoSkip}
              className="px-2 py-0.5 text-[11px] font-semibold text-violet-300 hover:text-white bg-violet-950/60 border border-violet-700/50 rounded-md transition-colors cursor-pointer shrink-0"
            >
              بازگردانی
            </button>
          )}
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-0.5 text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="بستن اعلان"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Task / Note Editor Modal */}
      {editingItem && (
        <ItemEditorModal
          isOpen={Boolean(editingItem)}
          item={editingItem}
          projects={projects}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveItem}
          onDelete={handleDeleteItem}
          onOpenSeriesModal={(seriesId) => setSelectedSeriesModalId(seriesId)}
        />
      )}

      {/* Recurrence Series Management Modal */}
      {selectedSeriesModalId && (
        <SeriesModal
          isOpen={Boolean(selectedSeriesModalId)}
          seriesItem={items.find((it) => it.id === selectedSeriesModalId) || null}
          onClose={() => setSelectedSeriesModalId(null)}
          onStopSeries={handleStopSeries}
          onRestoreOccurrence={handleRestoreOccurrenceInModal}
        />
      )}

      {/* Skip Occurrence Confirmation Modal */}
      {skipConfirmOccurrence && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
          onClick={() => setSkipConfirmOccurrence(null)}
        >
          <div
            className="w-full max-w-sm bg-[#181920] border border-[#2D2F3C] rounded-2xl p-5 shadow-2xl text-right animate-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-gray-100">صرف‌نظر از این نوبت؟</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              آیا از نادیده گرفتن نوبت «{skipConfirmOccurrence.title}» در تاریخ{' '}
              <span className="font-semibold text-violet-300">
                {formatJalaliDate(
                  skipConfirmOccurrence.originalScheduledDate || skipConfirmOccurrence.plannedDate || todayDate,
                  'full'
                )}
              </span>{' '}
              اطمینان دارید؟
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              این عمل زنجیره تکرار و سایر نوبت‌ها را تغییر نمی‌دهد و این نوبت از بخش مدیریت زنجیره قابل بازگردانی خواهد بود.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262835]">
              <button
                type="button"
                onClick={() => setSkipConfirmOccurrence(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmSkipOccurrence}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                صرف‌نظر از نوبت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        project={editingProject}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
      />

      {/* Backup and Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        items={items}
        projects={projects}
        onImportData={handleImportData}
        isItemEditorOpen={Boolean(editingItem)}
      />

      {/* Firebase Authentication & Cloud Architecture Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Explicit Local to Cloud Migration Modal */}
      {migrationModalState && (
        <MigrationModal
          isOpen={migrationModalState.isOpen}
          onClose={() => setMigrationModalState(null)}
          localItems={migrationModalState.localItems}
          localProjects={migrationModalState.localProjects}
          cloudItemsCount={migrationModalState.cloudItemsCount}
          cloudProjectsCount={migrationModalState.cloudProjectsCount}
          collidingCount={migrationModalState.collidingCount}
          onMigrate={handleExecuteMigration}
          onDismissWithoutMigration={handleDismissMigration}
        />
      )}

      {/* Task Completion Confirmation Modal for Open Steps */}
      {completeConfirmTarget && (
        <CompleteTaskConfirmModal
          isOpen={Boolean(completeConfirmTarget)}
          taskTitle={completeConfirmTarget.title}
          uncompletedCount={
            completeConfirmTarget.steps.filter((s) => s.text.trim().length > 0 && !s.completed).length
          }
          totalCount={completeConfirmTarget.steps.filter((s) => s.text.trim().length > 0).length}
          onCompleteAll={handleConfirmCompleteAll}
          onCompleteTaskOnly={handleConfirmCompleteTaskOnly}
          onCancel={() => setCompleteConfirmTarget(null)}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeView={activeView}
        filter={filter}
        onNavigate={handleNavigate}
        onOpenQuickCapture={handleOpenQuickCaptureFromMobile}
        isSimpleMode={isSimpleMode}
        onToggleSimpleMode={handleToggleSimpleMode}
        activeCount={todayActiveCount}
        projectsCount={activeProjectsCount}
      />
    </div>
  );
}

function AppRoot() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0F1016] flex flex-col items-center justify-center p-4 select-none">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/30 to-violet-900/20 border border-violet-500/40 flex items-center justify-center shadow-lg shadow-violet-950/50">
            <svg
              className="w-8 h-8 text-violet-400 animate-pulse"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#14151C] border border-violet-500/40 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
          </div>
        </div>
        <h2 className="text-base font-semibold text-gray-200 tracking-tight mb-1">کار روز</h2>
        <p className="text-xs text-gray-400">در حال بررسی وضعیت ورود...</p>
      </div>
    );
  }

  // Requirement 1: If user is not authenticated, show ONLY the calm, mobile-friendly Persian login view
  if (!user) {
    return <LoginView />;
  }

  // Requirement 1: After successful login, display user's workspace
  return <AppContent />;
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </SettingsProvider>
  );
}
