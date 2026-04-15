-- Enable Supabase Realtime for shared household tables
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE cards;
