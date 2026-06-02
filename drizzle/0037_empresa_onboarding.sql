ALTER TABLE `empresas`
  ADD COLUMN `onboardingEtapa` int NOT NULL DEFAULT 1,
  ADD COLUMN `onboardingConcluido` boolean NOT NULL DEFAULT false;
