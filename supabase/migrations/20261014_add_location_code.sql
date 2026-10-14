alter table public.locations add column code text;
alter table public.locations add constraint locations_code_format
  check (code is null or (code = upper(btrim(code)) and char_length(code) between 1 and 20));
alter table public.locations add constraint locations_code_key unique (code);
