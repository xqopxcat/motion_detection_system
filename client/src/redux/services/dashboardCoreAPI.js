import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getAuthHeaders } from '../../utils/auth';

export const dashboardCoreApi = createApi({
    reducerPath: 'dashboardCoreApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${import.meta.env.VITE_API_BASE_URL}/api/dashboard/`,
        prepareHeaders: (headers) => {
            const authHeaders = getAuthHeaders();
            Object.entries(authHeaders).forEach(([key, value]) => {
                headers.set(key, value);
            });
            return headers;
        }
    }),
    tagTypes: ['Dashboard'],
    endpoints: (builder) => ({
        getOverview: builder.query({
            query: (period = '30d') => `overview?period=${period}`,
        }),
        getTrainingRecords: builder.query({
            query: ({ page = 1, limit = 20, period = '30d', sortBy = 'createdAt', order = 'desc' }) => 
                `training-records?page=${page}&limit=${limit}&period=${period}&sortBy=${sortBy}&order=${order}`,
            providesTags: ['Dashboard']
        }),
        getTrends: builder.query({
            query: (period = '30d') => `trends?period=${period}`,
        }),
    })
});

export const { 
    useGetOverviewQuery,
    useGetTrainingRecordsQuery,
    useGetTrendsQuery
} = dashboardCoreApi;
