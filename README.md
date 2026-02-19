# Buildor Web Page (React)

React + Vite + TypeScript verzija Buildor home stranice. Izvor: `Sources/buildor-home-v5.html`.

## Pokretanje

```bash
npm install
npm run dev
```

Dev server: **http://localhost:3027**

## Build

```bash
npm run build
npm run preview   # pregled production builda
```

## Struktura

- **Sources/** — originalni HTML prototip (`buildor-home-v5.html`)
- **src/components/** — React komponente (Nav, Hero, Proof, FontShowcase, ArchSection, BentoSection, AgentsSection, HowSection, PlatformsSection, CTA, Footer, Modal)
- **src/hooks/useReveal.ts** — scroll reveal (Intersection Observer)
- **src/index.css** — Buildor design tokeni i stilovi (isti kao u HTML izvoru)

## Tehnologije

- React 18, Vite 5, TypeScript (strict)
- Čisti CSS (varijable iz Buildor design sustava), bez Tailwind u ovom projektu

## Daljnji razvoj

- Dodati rute (npr. React Router) ako treba više stranica
- Povezati CTA / Login na stvarne endpoint-e
- A/B testiranje naslova i CTA teksta
