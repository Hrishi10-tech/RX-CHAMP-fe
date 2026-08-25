import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ChatState {
  /** Unread messages across every conversation, for the badge in the shell. */
  unreadTotal: number;
}

const initialState: ChatState = { unreadTotal: 0 };

/**
 * Only the total lives here, because only the total is needed in two places at
 * once: the nav badge in the shell and the messages page. Threads and message
 * history stay local to the page that renders them.
 *
 * The notifier owns increments, since it is the one thing mounted on every
 * screen. The page owns decrements, because opening a thread is what marks it
 * read — split that the other way and the two would race over the same number.
 */
const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    /** Replaces the count with the server's, on open / reconnect / refocus. */
    chatUnreadSynced(state, action: PayloadAction<number>) {
      state.unreadTotal = Math.max(0, action.payload);
    },
    chatUnreadBumped(state) {
      state.unreadTotal += 1;
    },
    /** A thread was opened, which marks its messages read server-side too. */
    chatThreadRead(state, action: PayloadAction<number>) {
      state.unreadTotal = Math.max(0, state.unreadTotal - Math.max(0, action.payload));
    },
    chatUnreadCleared(state) {
      state.unreadTotal = 0;
    },
  },
});

export const { chatUnreadSynced, chatUnreadBumped, chatThreadRead, chatUnreadCleared } =
  chatSlice.actions;

export const chatReducer = chatSlice.reducer;
