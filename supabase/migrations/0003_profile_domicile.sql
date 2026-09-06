-- Adresse de domicile de la déléguée : permet à l'optimisation de tournée de
-- prévoir le retour chez soi en fin de journée plutôt que de s'arrêter au
-- dernier médecin visité, où qu'il se trouve.
alter table profiles
  add column adresse_domicile text,
  add column domicile_lat double precision,
  add column domicile_lon double precision;
