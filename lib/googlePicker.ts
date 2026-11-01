/**
 * Google Picker API Integration for AMOS-Breakthrough
 * Complies with Google Workspace Integration Skill
 * Client-side only widget utilizing PickerBuilder and OAuth access token
 */

import { getCachedGoogleAccessToken, signInWithGoogle } from './firebase';

export interface PickedGoogleDriveFile {
  id: string;
  name: string;
  path?: string;
  mimeType: string;
  url: string;
  iconUrl?: string;
  sizeBytes?: number;
  lastEditedUtc?: number;
  description?: string;
  isFolder?: boolean;
}

export interface PickerResponseData {
  action: string;
  docs?: Array<{
    id: string;
    name: string;
    mimeType: string;
    url: string;
    iconUrl?: string;
    sizeBytes?: number;
    lastEditedUtc?: number;
    description?: string;
  }>;
}

declare global {
  interface Window {
    gapi?: {
      load: (api: string, callback: () => void) => void;
    };
    google?: {
      picker?: {
        PickerBuilder: new () => GooglePickerBuilderInstance;
        ViewId: {
          DOCS: string;
          DOCS_IMAGES: string;
          DOCUMENTS: string;
          PDFS: string;
          FOLDERS: string;
        };
        Action: {
          PICKED: string;
          CANCEL: string;
          LOADED: string;
        };
        Feature: {
          MULTISELECT_ENABLED: string;
          SUPPORT_DRIVES: string;
        };
        DocsView: new (viewId?: string) => GoogleDocsViewInstance;
      };
    };
  }
}

interface GooglePickerBuilderInstance {
  addView: (view: unknown) => GooglePickerBuilderInstance;
  setOAuthToken: (token: string) => GooglePickerBuilderInstance;
  setCallback: (callback: (data: PickerResponseData) => void) => GooglePickerBuilderInstance;
  setOrigin: (origin: string) => GooglePickerBuilderInstance;
  setTitle: (title: string) => GooglePickerBuilderInstance;
  enableFeature: (feature: unknown) => GooglePickerBuilderInstance;
  build: () => { setVisible: (visible: boolean) => void };
}

interface GoogleDocsViewInstance {
  setIncludeFolders: (include: boolean) => GoogleDocsViewInstance;
  setSelectFolderEnabled: (enabled: boolean) => GoogleDocsViewInstance;
  setMimeTypes: (mimeTypes: string) => GoogleDocsViewInstance;
  setQuery: (query: string) => GoogleDocsViewInstance;
}

let isGapiLoading = false;
let isGapiLoaded = false;
const gapiCallbacks: Array<() => void> = [];

/**
 * Ensures the Google API loader (apis.google.com/js/api.js) is loaded in the browser
 */
export function loadGooglePickerApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Google Picker is only accessible in browser environments.'));
    }

    if (window.google?.picker) {
      isGapiLoaded = true;
      return resolve();
    }

    if (isGapiLoaded && window.gapi) {
      window.gapi.load('picker', () => {
        resolve();
      });
      return;
    }

    gapiCallbacks.push(resolve);

    if (isGapiLoading) return;
    isGapiLoading = true;

    // Check if script tag already exists
    const existingScript = document.getElementById('google-picker-api-script');
    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-picker-api-script';
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.gapi) {
        window.gapi.load('picker', () => {
          isGapiLoaded = true;
          isGapiLoading = false;
          while (gapiCallbacks.length > 0) {
            const cb = gapiCallbacks.shift();
            if (cb) cb();
          }
        });
      } else {
        isGapiLoading = false;
        reject(new Error('gapi object not found on window after script load'));
      }
    };
    script.onerror = (err) => {
      isGapiLoading = false;
      reject(new Error(`Failed to load Google Picker API script: ${String(err)}`));
    };

    document.head.appendChild(script);
  });
}

/**
 * Resolves the active OAuth token or triggers interactive sign-in
 */
export async function getOrRequestAccessToken(forceFresh: boolean = false): Promise<string> {
  if (forceFresh) {
    const { setCachedGoogleAccessToken } = await import('./firebase');
    setCachedGoogleAccessToken(null);
  }

  const existing = !forceFresh ? getCachedGoogleAccessToken() : null;
  if (existing) {
    return existing;
  }

  // Interactive sign-in to obtain required authorized scopes
  try {
    const { accessToken } = await signInWithGoogle([
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.rosters.readonly'
    ]);

    if (!accessToken) {
      throw new Error('Could not acquire Google OAuth access token for Google Drive integration.');
    }

    return accessToken;
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup closed')) {
      const authErr = new Error('Google sign-in popup was closed before authorization completed.');
      (authErr as any).isUserCancelled = true;
      throw authErr;
    }
    if (err?.code === 'auth/cancelled-popup-request' || err?.message?.includes('cancelled')) {
      const authErr = new Error('Authorization request was cancelled.');
      (authErr as any).isUserCancelled = true;
      throw authErr;
    }
    throw err;
  }
}

/**
 * Invalidate cached Google access token to force re-authorization
 */
export async function clearCachedGoogleToken(): Promise<void> {
  const { setCachedGoogleAccessToken } = await import('./firebase');
  setCachedGoogleAccessToken(null);
}

export type PickerLoadingPhase = 'idle' | 'loading_api' | 'requesting_auth' | 'opening_picker' | 'expanding_folders';

export interface OpenGooglePickerOptions {
  title?: string;
  query?: string; // Query string to pre-search Google Drive files using Google Picker API
  multiSelect?: boolean;
  mimeFilter?: string; // e.g. "application/pdf,application/vnd.google-apps.document"
  forceFreshAuth?: boolean;
  onLoadingStateChange?: (phase: PickerLoadingPhase) => void;
  onPicked: (files: PickedGoogleDriveFile[]) => void;
  onCancel?: (reason: 'user_closed_picker' | 'user_cancelled_auth') => void;
  onError?: (error: Error, details: { isAuthExpired: boolean; isUserCancelled: boolean }) => void;
}

/**
 * Recursively fetches all child files and subfolders within a picked Google Drive folder
 * using Google Drive v3 REST API with the active OAuth access token.
 */
export async function expandGoogleDriveFolderRecursively(
  folderId: string,
  folderPath: string,
  accessToken: string
): Promise<PickedGoogleDriveFile[]> {
  const resultFiles: PickedGoogleDriveFile[] = [];

  async function fetchChildren(parentFolderId: string, currentPath: string): Promise<void> {
    try {
      let pageToken: string | undefined = undefined;
      do {
        const queryParams = new URLSearchParams({
          q: `'${parentFolderId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, iconLink, modifiedTime, description)',
          pageSize: '100',
          supportsAllDrives: 'true',
          includeItemsFromAllDrives: 'true',
        });
        if (pageToken) {
          queryParams.set('pageToken', pageToken);
        }

        const res = await fetch(`https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          console.warn(`Failed to list children for Google Drive folder ${parentFolderId}:`, res.statusText);
          break;
        }

        const data = await res.json();
        const files = data.files || [];

        for (const f of files) {
          const relativePath = currentPath ? `${currentPath}/${f.name}` : f.name;
          if (f.mimeType === 'application/vnd.google-apps.folder') {
            await fetchChildren(f.id, relativePath);
          } else {
            resultFiles.push({
              id: f.id,
              name: f.name,
              path: relativePath,
              mimeType: f.mimeType,
              url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
              iconUrl: f.iconLink,
              sizeBytes: f.size ? parseInt(f.size, 10) : 102400,
              lastEditedUtc: f.modifiedTime ? new Date(f.modifiedTime).getTime() : undefined,
              description: f.description,
              isFolder: false,
            });
          }
        }

        pageToken = data.nextPageToken;
      } while (pageToken);
    } catch (err) {
      console.warn('Error expanding Google Drive folder:', err);
    }
  }

  await fetchChildren(folderId, folderPath);
  return resultFiles;
}

/**
 * Launches the Google Drive Picker modal adhering strictly to iframe origin constraints
 */
export async function openGoogleDrivePicker(options: OpenGooglePickerOptions): Promise<void> {
  const {
    title = 'Select Clinical Document or Folder from Google Drive',
    query,
    multiSelect = true,
    mimeFilter,
    forceFreshAuth = false,
    onLoadingStateChange,
    onPicked,
    onCancel,
    onError
  } = options;

  try {
    if (onLoadingStateChange) onLoadingStateChange('loading_api');
    await loadGooglePickerApi();

    if (onLoadingStateChange) onLoadingStateChange('requesting_auth');
    const token = await getOrRequestAccessToken(forceFreshAuth);

    if (onLoadingStateChange) onLoadingStateChange('opening_picker');

    if (!window.google?.picker) {
      throw new Error('Google Picker API failed to initialize.');
    }

    // Determine picker origin with ancestorOrigins support for iframe embedding
    const locationWithOrigins = window.location as Location & { ancestorOrigins?: DOMStringList };
    const pickerOrigin =
      locationWithOrigins.ancestorOrigins && locationWithOrigins.ancestorOrigins.length > 0
        ? locationWithOrigins.ancestorOrigins[locationWithOrigins.ancestorOrigins.length - 1]
        : window.location.origin;

    const pickerBuilder = new window.google.picker.PickerBuilder();

    // Primary Google Docs / Drive View with search query and filter support
    let docsView: GoogleDocsViewInstance | string = window.google.picker.ViewId.DOCS;
    if (window.google.picker.DocsView) {
      const customView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
      if (mimeFilter) customView.setMimeTypes(mimeFilter);
      if (query && query.trim()) customView.setQuery(query.trim());
      customView.setIncludeFolders(true);
      customView.setSelectFolderEnabled(true);
      docsView = customView;
    }

    pickerBuilder.addView(docsView);

    // Dedicated Folders View so users can select entire directories from Google Drive
    if (window.google.picker.DocsView && window.google.picker.ViewId.FOLDERS) {
      const folderView = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS);
      folderView.setSelectFolderEnabled(true);
      folderView.setIncludeFolders(true);
      pickerBuilder.addView(folderView);
    }

    pickerBuilder
      .setOAuthToken(token)
      .setOrigin(pickerOrigin)
      .setTitle(title)
      .setCallback(async (data: PickerResponseData) => {
        if (data.action === window.google?.picker?.Action.PICKED) {
          const rawDocs = data.docs || [];
          const directFiles: PickedGoogleDriveFile[] = [];
          const foldersToExpand: Array<{ id: string; name: string }> = [];

          for (const doc of rawDocs) {
            if (doc.mimeType === 'application/vnd.google-apps.folder') {
              foldersToExpand.push({ id: doc.id, name: doc.name });
            } else {
              directFiles.push({
                id: doc.id,
                name: doc.name,
                path: doc.name,
                mimeType: doc.mimeType,
                url: doc.url || `https://drive.google.com/file/d/${doc.id}/view`,
                iconUrl: doc.iconUrl,
                sizeBytes: doc.sizeBytes,
                lastEditedUtc: doc.lastEditedUtc,
                description: doc.description,
                isFolder: false,
              });
            }
          }

          if (foldersToExpand.length > 0) {
            if (onLoadingStateChange) onLoadingStateChange('expanding_folders');
            try {
              const expandedPromises = foldersToExpand.map((f) =>
                expandGoogleDriveFolderRecursively(f.id, f.name, token)
              );
              const expandedGroups = await Promise.all(expandedPromises);
              const allExpanded = expandedGroups.flat();
              if (onLoadingStateChange) onLoadingStateChange('idle');
              onPicked([...directFiles, ...allExpanded]);
            } catch (err) {
              console.warn('Failed expanding some folders from Drive:', err);
              if (onLoadingStateChange) onLoadingStateChange('idle');
              onPicked(directFiles);
            }
          } else {
            if (onLoadingStateChange) onLoadingStateChange('idle');
            onPicked(directFiles);
          }
        } else if (data.action === window.google?.picker?.Action.CANCEL) {
          if (onLoadingStateChange) onLoadingStateChange('idle');
          if (onCancel) onCancel('user_closed_picker');
        }
      });

    if (multiSelect && window.google.picker.Feature) {
      pickerBuilder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
    }

    if (window.google.picker.Feature?.SUPPORT_DRIVES) {
      pickerBuilder.enableFeature(window.google.picker.Feature.SUPPORT_DRIVES);
    }

    const picker = pickerBuilder.build();
    picker.setVisible(true);
  } catch (err: any) {
    if (onLoadingStateChange) onLoadingStateChange('idle');
    const isUserCancelled = !!err?.isUserCancelled || err?.code === 'auth/popup-closed-by-user';
    const isAuthExpired =
      !isUserCancelled &&
      (err?.code?.includes('auth') ||
        err?.message?.toLowerCase().includes('token') ||
        err?.message?.toLowerCase().includes('auth') ||
        err?.message?.toLowerCase().includes('permission') ||
        err?.status === 401 ||
        err?.status === 403);

    if (isUserCancelled) {
      if (onCancel) onCancel('user_cancelled_auth');
    }

    if (onError) {
      onError(err instanceof Error ? err : new Error(String(err)), {
        isAuthExpired,
        isUserCancelled
      });
    } else {
      throw err;
    }
  }
}
