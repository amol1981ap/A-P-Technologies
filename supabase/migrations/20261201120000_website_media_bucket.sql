-- Public folder for website videos and photos the owner uploads in the dashboard (up to 200 MB each).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('website-media', 'website-media', true, 209715200, array['video/mp4','video/quicktime','video/webm','video/3gpp','image/jpeg','image/png'])
on conflict (id) do nothing;
