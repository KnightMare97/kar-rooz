/**
 * KarRooz Firestore Repository Service
 *
 * Implements per-user Firestore persistence for authenticated users,
 * realtime subscriptions with metadata tracking (pending writes vs server-confirmed),
 * stable ID entities, and safe local-data migration.
 */
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  SnapshotMetadata,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Item, Project } from '../types';

export interface CloudStatusInfo {
  itemsCount: number;
  projectsCount: number;
  cloudItemIds: Set<string>;
  cloudProjectIds: Set<string>;
  hasCloudData: boolean;
}

export type CollisionResolution = 'skip' | 'overwrite' | 'rename';

export interface MigrationResult {
  success: boolean;
  migratedItemsCount: number;
  migratedProjectsCount: number;
  skippedCollisionsCount: number;
  error?: string;
}

/**
 * Clean plain object to remove undefined keys which Firestore rejects
 */
function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanObject(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as Partial<T>;
}

/**
 * Sanitize Project entity for Firestore to match Security Rules and Schema
 */
export function sanitizeProjectForFirestore(project: Project, userId: string) {
  const raw = {
    id: String(project.id),
    userId,
    name: String(project.name || '').trim(),
    description: project.description ? String(project.description).trim() : undefined,
    color: String(project.color || '#818CF8'),
    createdAt: project.createdAt || new Date().toISOString(),
    archived: Boolean(project.archived),
    archivedAt: project.archivedAt ? String(project.archivedAt) : undefined,
  };
  return cleanObject(raw);
}

/**
 * Sanitize Item entity (Task or Note) for Firestore to match Security Rules and Schema
 */
export function sanitizeItemForFirestore(item: Item, userId: string) {
  const raw = {
    id: String(item.id),
    userId,
    type: item.type === 'note' ? 'note' : 'task',
    title: String(item.title || '').trim(),
    description: item.description !== undefined ? String(item.description).trim() : undefined,
    completed: Boolean(item.completed),
    status: item.type === 'task' ? (item.status || (item.completed ? 'done' : 'todo')) : undefined,
    projectId: item.projectId ? String(item.projectId) : undefined,
    legacyProjectLabel: item.legacyProjectLabel ? String(item.legacyProjectLabel) : undefined,
    project: item.project ? String(item.project) : undefined,
    tags: Array.isArray(item.tags) ? item.tags.map((t) => String(t).trim()).filter(Boolean) : [],
    createdAt: item.createdAt || new Date().toISOString(),
    completedAt: item.completedAt ? String(item.completedAt) : undefined,
    inToday: item.inToday !== undefined ? Boolean(item.inToday) : undefined,
    destination: item.destination ? String(item.destination) : undefined,
    plannedDate: item.plannedDate ? String(item.plannedDate).slice(0, 10) : undefined,
    dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : undefined,
    recurrence: item.recurrence ? cleanObject(item.recurrence) : undefined,
    occurrenceOverrides: item.occurrenceOverrides ? cleanObject(item.occurrenceOverrides) : undefined,
  };
  return cleanObject(raw);
}

/**
 * Subscribe to the authenticated user's projects with realtime updates and write-status tracking
 */
export function subscribeToUserProjects(
  userId: string,
  onUpdate: (projects: Project[], metadata: { hasPendingWrites: boolean; fromCache: boolean }) => void,
  onError: (error: Error) => void
): () => void {
  const projectsPath = `users/${userId}/projects`;
  const projectsCol = collection(db, 'users', userId, 'projects');

  return onSnapshot(
    projectsCol,
    { includeMetadataChanges: true },
    (snapshot) => {
      const projects: Project[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        projects.push({
          id: docSnap.id,
          name: data.name,
          description: data.description,
          color: data.color || '#818CF8',
          createdAt: data.createdAt || new Date().toISOString(),
          archived: Boolean(data.archived),
          archivedAt: data.archivedAt,
        });
      });

      onUpdate(projects, {
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
        fromCache: snapshot.metadata.fromCache,
      });
    },
    (err) => {
      console.error('Firestore Projects Subscription Error:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, projectsPath);
      } catch (wrappedErr) {
        onError(wrappedErr instanceof Error ? wrappedErr : new Error(String(wrappedErr)));
      }
    }
  );
}

/**
 * Subscribe to the authenticated user's items (Tasks and Notes) with realtime updates
 */
export function subscribeToUserItems(
  userId: string,
  onUpdate: (items: Item[], metadata: { hasPendingWrites: boolean; fromCache: boolean }) => void,
  onError: (error: Error) => void
): () => void {
  const itemsPath = `users/${userId}/items`;
  const itemsCol = collection(db, 'users', userId, 'items');

  return onSnapshot(
    itemsCol,
    { includeMetadataChanges: true },
    (snapshot) => {
      const items: Item[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          type: data.type || 'task',
          title: data.title || '',
          description: data.description,
          completed: Boolean(data.completed),
          status: data.status,
          projectId: data.projectId,
          legacyProjectLabel: data.legacyProjectLabel,
          project: data.project,
          tags: Array.isArray(data.tags) ? data.tags : [],
          createdAt: data.createdAt || new Date().toISOString(),
          completedAt: data.completedAt,
          inToday: data.inToday,
          destination: data.destination,
          plannedDate: data.plannedDate,
          dueDate: data.dueDate,
          recurrence: data.recurrence,
          occurrenceOverrides: data.occurrenceOverrides,
        });
      });

      onUpdate(items, {
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
        fromCache: snapshot.metadata.fromCache,
      });
    },
    (err) => {
      console.error('Firestore Items Subscription Error:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, itemsPath);
      } catch (wrappedErr) {
        onError(wrappedErr instanceof Error ? wrappedErr : new Error(String(wrappedErr)));
      }
    }
  );
}

/**
 * Save or update a single Item in Firestore with stable ID
 */
export async function saveFirestoreItem(userId: string, item: Item): Promise<void> {
  const docPath = `users/${userId}/items/${item.id}`;
  try {
    const itemRef = doc(db, 'users', userId, 'items', item.id);
    const sanitized = sanitizeItemForFirestore(item, userId);
    await setDoc(itemRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Delete a single Item in Firestore with stable ID
 */
export async function deleteFirestoreItem(userId: string, itemId: string): Promise<void> {
  const docPath = `users/${userId}/items/${itemId}`;
  try {
    const itemRef = doc(db, 'users', userId, 'items', itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Save or update a single Project in Firestore with stable ID
 */
export async function saveFirestoreProject(userId: string, project: Project): Promise<void> {
  const docPath = `users/${userId}/projects/${project.id}`;
  try {
    const projectRef = doc(db, 'users', userId, 'projects', project.id);
    const sanitized = sanitizeProjectForFirestore(project, userId);
    await setDoc(projectRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Delete a single Project in Firestore with stable ID
 */
export async function deleteFirestoreProject(userId: string, projectId: string): Promise<void> {
  const docPath = `users/${userId}/projects/${projectId}`;
  try {
    const projectRef = doc(db, 'users', userId, 'projects', projectId);
    await deleteDoc(projectRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Check existing data counts in Firestore for a user before migration
 */
export async function fetchCloudStatus(userId: string): Promise<CloudStatusInfo> {
  const itemsPath = `users/${userId}/items`;
  const projectsPath = `users/${userId}/projects`;

  try {
    const [itemsSnap, projectsSnap] = await Promise.all([
      getDocs(collection(db, 'users', userId, 'items')),
      getDocs(collection(db, 'users', userId, 'projects')),
    ]);

    const cloudItemIds = new Set<string>();
    itemsSnap.forEach((d) => cloudItemIds.add(d.id));

    const cloudProjectIds = new Set<string>();
    projectsSnap.forEach((d) => cloudProjectIds.add(d.id));

    return {
      itemsCount: itemsSnap.size,
      projectsCount: projectsSnap.size,
      cloudItemIds,
      cloudProjectIds,
      hasCloudData: itemsSnap.size > 0 || projectsSnap.size > 0,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${itemsPath} & ${projectsPath}`);
  }
}

/**
 * Perform explicit, idempotent migration of local data to Firestore
 * Does not finish until server writes are acknowledged
 */
export async function migrateLocalDataToFirestore(
  userId: string,
  localItems: Item[],
  localProjects: Project[],
  resolution: CollisionResolution = 'skip'
): Promise<MigrationResult> {
  const cloudStatus = await fetchCloudStatus(userId);
  let migratedItems = 0;
  let migratedProjects = 0;
  let skippedCollisions = 0;

  // Track project ID mapping if renaming is used
  const projectIdMap = new Map<string, string>();

  // 1. Process Projects
  for (const project of localProjects) {
    let targetId = project.id;
    if (cloudStatus.cloudProjectIds.has(project.id)) {
      if (resolution === 'skip') {
        skippedCollisions++;
        continue;
      }
      if (resolution === 'rename') {
        targetId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        projectIdMap.set(project.id, targetId);
      }
    }

    const projectToSave: Project = {
      ...project,
      id: targetId,
    };
    await saveFirestoreProject(userId, projectToSave);
    migratedProjects++;
  }

  // 2. Process Items
  for (const item of localItems) {
    let targetId = item.id;
    if (cloudStatus.cloudItemIds.has(item.id)) {
      if (resolution === 'skip') {
        skippedCollisions++;
        continue;
      }
      if (resolution === 'rename') {
        targetId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }
    }

    // Remap project ID if project was renamed
    let targetProjectId = item.projectId;
    if (targetProjectId && projectIdMap.has(targetProjectId)) {
      targetProjectId = projectIdMap.get(targetProjectId);
    }

    const itemToSave: Item = {
      ...item,
      id: targetId,
      projectId: targetProjectId,
    };
    await saveFirestoreItem(userId, itemToSave);
    migratedItems++;
  }

  return {
    success: true,
    migratedItemsCount: migratedItems,
    migratedProjectsCount: migratedProjects,
    skippedCollisionsCount: skippedCollisions,
  };
}
