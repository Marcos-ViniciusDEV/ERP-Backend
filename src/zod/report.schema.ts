import { z } from "zod";

export const reportFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["contains", "equals", "notEquals", "gte", "lte", "between", "in"]),
  value: z.unknown(),
});

export const reportSortSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

export const reportQuerySchema = z.object({
  filters: z.array(reportFilterSchema).default([]),
  columns: z.array(z.string().min(1)).default([]),
  sort: z.array(reportSortSchema).default([]),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(500).default(50),
});

export const reportExportSchema = reportQuerySchema.omit({ page: true, pageSize: true }).extend({
  maxRows: z.number().int().min(1).max(200000).default(50000),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type ReportExportInput = z.infer<typeof reportExportSchema>;
