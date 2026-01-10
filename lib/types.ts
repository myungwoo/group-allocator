export type PenaltyMode = 'exclude-penalized' | 'exclude-self' | 'include-self';

export type IncentiveItem = {
  id: string;
  label: string;
  amount: number;
  /** 수령자: 멤버 id (없으면 미지정) */
  recipientId?: string;
};

export type IncomeItem = {
  id: string;
  label: string;
  gross: number;
  feeRate: number; // %
};

export type PenaltyItem = {
  id: string;
  label: string;
  amount: number;
  /** 지불자: 멤버 id (없으면 미지정) */
  payerId?: string;
  mode: PenaltyMode;
};

export type Member = {
  id: string;
  name: string;
  exclude: boolean;
  note: string;
};

export type AppState = {
  date: string; // YYYY-MM-DD
  title: string;
  incentives: IncentiveItem[];
  penaltyItems: PenaltyItem[];
  incomeItems: IncomeItem[];
  members: Member[];
  memo: string;
};

export type TabItem = {
  id: string;
  date: string;
  title: string;
  data: AppState;
};

export type TabsState = {
  activeId: string;
  items: TabItem[];
};

