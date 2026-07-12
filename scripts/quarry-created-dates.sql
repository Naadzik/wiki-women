-- Wikimedia Quarry — creation date of every article created by User:Nadzik
-- =========================================================================
-- Quarry runs SQL server-side on the Wikimedia replica DBs, so it works even
-- when the public API is unreachable from your machine.
--
-- How to run:
--   1. Go to https://quarry.wmcloud.org and sign in with your Wikimedia account.
--   2. New query. (The `USE plwiki_p;` line below selects the Polish Wikipedia DB,
--      so you don't need to pick a database from the dropdown.)
--   3. Paste this whole query, press Submit, then download CSV/JSON when done.
--
-- What it returns: for every page whose FIRST revision (rev_parent_id = 0) was
-- made by Nadzik, in the main article namespace (0) and user/draft space (2):
--   title, namespace, creation date, raw timestamp, creator.
--
-- Match the `title` column against data/wikiwomen.json to fill in the exact
-- `created` dates. This is a superset — it also lists any other pages Nadzik
-- created — so filter to the titles you care about. For an EXACT match to the
-- 455 titles instead, use scripts/quarry-created-dates-bytitle.sql.

USE plwiki_p;

SELECT
    REPLACE(CONVERT(p.page_title USING utf8mb4), '_', ' ') AS title,
    p.page_namespace,
    STR_TO_DATE(r.rev_timestamp, '%Y%m%d%H%i%s')          AS created,
    r.rev_timestamp                                        AS created_raw,
    a.actor_name                                           AS creator
FROM actor      AS a
JOIN revision   AS r ON r.rev_actor = a.actor_id AND r.rev_parent_id = 0
JOIN page       AS p ON p.page_id   = r.rev_page
WHERE a.actor_name = 'Nadzik'
  AND p.page_namespace IN (0, 2)
ORDER BY created;
