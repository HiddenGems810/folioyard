import type { MergeProgress } from './merge';

export type MergeRequest = { files: Array<{ name: string; file: File }> };
export type MergeResponse =
  | ({ type: 'progress'; totalFiles: number } & MergeProgress)
  | { type: 'success'; bytes: ArrayBuffer; pageCount: number }
  | { type: 'error'; message: string };
