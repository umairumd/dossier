CREATE TABLE IF NOT EXISTS public.leave_balance_adjustments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_balance_id UUID NOT NULL REFERENCES public.leave_balances(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  adjusted_by      UUID NOT NULL REFERENCES public.profiles(id),
  adjustment       NUMERIC NOT NULL,
  note             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_balance_adjustments_admin_read
  ON public.leave_balance_adjustments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'owner')
        AND p.organization_id = (
          SELECT organization_id FROM public.profiles WHERE id = profile_id
        )
    )
  );

CREATE POLICY leave_balance_adjustments_admin_insert
  ON public.leave_balance_adjustments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'owner')
    )
  );
