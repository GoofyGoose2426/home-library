-- Alexandra doesn't track which physical bookcase a book is on. A print copy
-- is just "Bookshelf" (copies.source = 'shelf'); digital copies keep their
-- app (Kobo, Audible, Libro.fm) in copies.source.
alter table public.copies drop column location;
