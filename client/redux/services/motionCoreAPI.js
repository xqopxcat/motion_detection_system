import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const motionCoreApi = createApi({
    reducerPath: 'motionCoreApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'http://localhost:8080/api/',
    }),
    tagTypes: ['Motion'],
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
        })
    })
});

export const { 
    useGetMotionsQuery,
    useGetMotionDetailsQuery,
    useCreateMotionMutation,
    useDeleteMotionMutation
} = motionCoreApi;
