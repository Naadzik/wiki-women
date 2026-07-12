# Creation dates — reconciliation status

Source: Quarry query 107217 (pages created by User:Nadzik), matched against
`data/wikiwomen.json`. Existing dates were all verified correct (0 changed).
69 of the 76 previously-null dates are now filled. 7 remain.

## ✅ Applied — transliteration / moved articles (verify if you like)

These were moved to a Polish transliteration by other editors, so exact title
match missed them; the date comes from the moved article (same person).

| Your data's title | Current wiki title | Applied date |
|---|---|---|
| Reema bint Bandar Al Saud | Rima bint Bandar Al Su’ud | 2025-03-28 |
| Zaruhi Postandżjan | Zaruhi Postandżian | 2025-03-29 |
| Sahiba Gafarowa | Sahibə Qafarova | 2025-05-19 |
| Taira Tairowa | Tahirə Tahirova | 2026-04-06 |
| Marina Waśko | Maryna Waśko | 2025-05-12 |
| Gordana Djurović | Gordana Đurović | 2026-04-09 |
| Jihan al-Mosli | Dżihan al-Musli | 2025-08-22 |
| Eleni Skoura | Eleni Skura | 2025-11-12 |
| Shanaz Ibrahim Ahmed | Szanaz Ibrahim Ahmad | 2026-02-26 |
| Leila Sharaf | Lajla Szaraf | 2025-07-26 |
| Olga Perepechina | Olga Pieriepieczina | 2026-05-22 |
| Najla El Mangoush | Nadżla al-Mangusz | 2025-09-09 |
| Monika Zajkova | Monika Zajkowa | 2025-05-25 |
| Tatyana Zalevskaya | Tatjana Zalewska | 2026-05-25 |
| Sükhbaataryn Yanjmaa | Süchbaataryn Jandżmaa | 2025-09-04 |
| Nizoramoh Zarifowa | Nizoramo Zaripowa | 2025-08-25 |
| Samiha Khalil | Samiha Chalil | 2025-10-07 |

## 🔎 Hunt down by hand — still null (7)

**Not created by Nadzik** — they pre-existed or were started by other editors,
so the *by-creator* query can't see them. Run `scripts/quarry-created-dates-bytitle.sql`
(matches by title, any creator) to get their real first-revision date:

- [ ] Nancy Pelosi
- [ ] Jeanine Áñez
- [ ] Rawya Ateya
- [ ] Lateefa Al Gaood
- [ ] Hind Abdul Rahman al-Muftah
- [ ] Blaise Metreweli

**Bad fuzzy match — do NOT trust the guess:**

- [ ] Aleksandra Kot — fuzzy-matched to *Aleksandra Skoczilenko* (2025-05-24),
      but that is a different person (an anti-war artist). Find the real article
      title manually.

_Note: `Emma Macdonald` did not match either but already had a date
(2026-01-28), so it was left as-is._
