import { configureStore } from '@reduxjs/toolkit';
import { motionCoreApi } from './services/motionCoreAPI';

export const store = configureStore({
    reducer: {
        [motionCoreApi.reducerPath]: motionCoreApi.reducer
    },
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware().concat(motionCoreApi.middleware)
});