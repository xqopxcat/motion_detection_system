import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getAuthHeaders } from '../../utils/auth';

export const motionCoreApi = createApi({
    reducerPath: 'motionCoreApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${import.meta.env.VITE_API_BASE_URL}/api/`,
        prepareHeaders: (headers) => {
            const authHeaders = getAuthHeaders();
            Object.entries(authHeaders).forEach(([key, value]) => {
                headers.set(key, value);
            });
            return headers;
        }
    }),
    tagTypes: ['Motion', 'Annotations'],
    endpoints: (builder) => ({
        getMotions: builder.query({
            query: () => 'motions',
            providesTags: ['Motion']
        }),
        getMotionDetails: builder.query({
            query: (id) => `motions/${id}`,
        }),
        createMotion: builder.mutation({
            query: (motionData) => {
              return ({
                url: 'motions',
                method: 'POST',
                body: motionData
              })
            },
            invalidatesTags: ['Motion']
        }),
        deleteMotion: builder.mutation({
            query: (id) => ({
                url: `motions/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['Motion']
        }),
    })
});

export const { 
    useGetMotionsQuery,
    useGetMotionDetailsQuery,
    useCreateMotionMutation,
    useDeleteMotionMutation,
} = motionCoreApi;
