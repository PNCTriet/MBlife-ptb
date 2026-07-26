export type Honorific = "Anh" | "Chị" | "Mr" | "Ms";

export type Employee = {
  id: string;
  code: string;
  name: string;
  days: number;
  title: Honorific;
  wish: string;
};

export type LiveState = {
  id: number;
  employee_id: string | null;
  employee_name: string | null;
  days: number | null;
  title: Honorific | null;
  wish: string | null;
  triggered_at: string | null;
  updated_at: string;
};
