import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getAuthHeaders } from '../../utils/auth';

export const annotationCoreAPI = createApi({
    reducerPath: 'annotationCoreAPI',
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
    tagTypes: ['Annotations'],
    endpoints: (builder) => ({
        getAnnotations: builder.query({
            query: (sessionId) => `annotations/${sessionId}`,
            providesTags: ['Annotations']
        }),
        createAnnotation: builder.mutation({
          query: (annotationData) => {
            return ({
              url: 'annotations',
              method: 'POST',
              body: annotationData
            })
          },
          invalidatesTags: ['Annotations']
        }),
        updateAnnotation: builder.mutation({
            query: ({ annotationId, ...patch }) => {
              return ({
                url: `annotations/${annotationId}`,
                method: 'PUT',
                body: patch
              });
            },
            invalidatesTags: ['Annotations']
        }),
        deleteAnnotation: builder.mutation({
            query: (annotationId) => {
              return ({
                url: `annotations/${annotationId}`,
                method: 'DELETE'
              });
            },
            invalidatesTags: ['Annotations']
        })
    })
});

export const { 
    useGetAnnotationsQuery,
    useCreateAnnotationMutation,
    useUpdateAnnotationMutation,
    useDeleteAnnotationMutation
} = annotationCoreAPI;
