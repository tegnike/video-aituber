import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAppState,
  updateAppState,
  resetAppState,
  subscribe,
  type AppState,
  type QueuedComment,
  type RemoteCommand,
} from './remoteState';

describe('remoteState', () => {
  beforeEach(() => {
    resetAppState();
  });

  describe('getAppState', () => {
    it('初期状態を返す', () => {
      const state = getAppState();
      expect(state).toEqual({
        hasStarted: false,
        screenMode: null,
        isLoadingBackground: false,
        isLoadingControlVideo: false,
        controlVideoType: null,
        oneCommeEnabled: false,
        oneCommeConnected: false,
        isScriptSending: false,
        uiVisibility: {
          controls: true,
          chatHistory: true,
          chatInput: true,
        },
        commentQueue: [],
      });
    });
  });

  describe('updateAppState', () => {
    it('部分的な状態更新ができる', () => {
      updateAppState({ hasStarted: true });
      const state = getAppState();
      expect(state.hasStarted).toBe(true);
      expect(state.screenMode).toBeNull();
    });

    it('複数のフィールドを同時に更新できる', () => {
      updateAppState({
        hasStarted: true,
        screenMode: 'standby',
        oneCommeEnabled: true,
      });
      const state = getAppState();
      expect(state.hasStarted).toBe(true);
      expect(state.screenMode).toBe('standby');
      expect(state.oneCommeEnabled).toBe(true);
    });

    it('uiVisibilityを部分的に更新できる', () => {
      updateAppState({
        uiVisibility: { controls: false, chatHistory: true, chatInput: true },
      });
      const state = getAppState();
      expect(state.uiVisibility.controls).toBe(false);
      expect(state.uiVisibility.chatHistory).toBe(true);
    });
  });

  describe('resetAppState', () => {
    it('状態を初期値にリセットする', () => {
      updateAppState({ hasStarted: true, screenMode: 'room' });
      resetAppState();
      const state = getAppState();
      expect(state.hasStarted).toBe(false);
      expect(state.screenMode).toBeNull();
    });
  });

  describe('subscribe', () => {
    it('状態変更時にサブスクライバーが呼ばれる', () => {
      const states: AppState[] = [];
      const unsubscribe = subscribe((state) => {
        states.push({ ...state, uiVisibility: { ...state.uiVisibility } });
      });

      updateAppState({ hasStarted: true });

      expect(states.length).toBe(1);
      expect(states[0].hasStarted).toBe(true);

      unsubscribe();
    });

    it('unsubscribe後はサブスクライバーが呼ばれない', () => {
      const states: AppState[] = [];
      const unsubscribe = subscribe((state) => {
        states.push({ ...state, uiVisibility: { ...state.uiVisibility } });
      });

      updateAppState({ hasStarted: true });
      unsubscribe();
      updateAppState({ screenMode: 'standby' });

      expect(states.length).toBe(1);
    });

    it('複数のサブスクライバーを登録できる', () => {
      let count1 = 0;
      let count2 = 0;

      const unsub1 = subscribe(() => { count1++; });
      const unsub2 = subscribe(() => { count2++; });

      updateAppState({ hasStarted: true });

      expect(count1).toBe(1);
      expect(count2).toBe(1);

      unsub1();
      unsub2();
    });
  });

  describe('QueuedComment型', () => {
    it('必須フィールドを持つ', () => {
      const comment: QueuedComment = {
        id: 'comment-1',
        name: 'テストユーザー',
        comment: 'テストコメント',
        receivedAt: Date.now(),
        isSent: false,
      };
      expect(comment.id).toBe('comment-1');
      expect(comment.name).toBe('テストユーザー');
      expect(comment.comment).toBe('テストコメント');
      expect(comment.isSent).toBe(false);
    });

    it('オプショナルなprofileImageフィールドを持てる', () => {
      const comment: QueuedComment = {
        id: 'comment-2',
        name: 'テストユーザー',
        comment: 'テストコメント',
        profileImage: 'https://example.com/avatar.png',
        receivedAt: Date.now(),
        isSent: false,
      };
      expect(comment.profileImage).toBe('https://example.com/avatar.png');
    });
  });

  describe('commentQueue in AppState', () => {
    it('初期状態で空配列を持つ', () => {
      const state = getAppState();
      expect(state.commentQueue).toEqual([]);
    });

    it('コメントキューを更新できる', () => {
      const comment: QueuedComment = {
        id: 'comment-1',
        name: 'テストユーザー',
        comment: 'テストコメント',
        receivedAt: Date.now(),
        isSent: false,
      };
      updateAppState({ commentQueue: [comment] });
      const state = getAppState();
      expect(state.commentQueue.length).toBe(1);
      expect(state.commentQueue[0].id).toBe('comment-1');
    });

    it('リセット時にコメントキューも空になる', () => {
      const comment: QueuedComment = {
        id: 'comment-1',
        name: 'テストユーザー',
        comment: 'テストコメント',
        receivedAt: Date.now(),
        isSent: false,
      };
      updateAppState({ commentQueue: [comment] });
      resetAppState();
      const state = getAppState();
      expect(state.commentQueue).toEqual([]);
    });
  });

  describe('sendQueuedComment command', () => {
    it('RemoteCommand型にsendQueuedCommentが含まれる', () => {
      const command: RemoteCommand = {
        type: 'sendQueuedComment',
        commentId: 'comment-1',
      };
      expect(command.type).toBe('sendQueuedComment');
      expect(command.commentId).toBe('comment-1');
    });
  });

});
