CREATE POLICY "notifications_self_delete" ON notifications
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());
