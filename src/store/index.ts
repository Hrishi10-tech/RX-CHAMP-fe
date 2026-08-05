import { configureStore } from "@reduxjs/toolkit";

import { authReducer } from "@/features/auth/store/authSlice";

/**
 * Built per client instance rather than as a module singleton so server
 * rendering never shares one user's session state with another request.
 */
export function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
