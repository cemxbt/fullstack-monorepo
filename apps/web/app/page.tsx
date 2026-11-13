import { Board } from './board';

export default function HomePage() {
  return (
    <main className="container">
      <header className="header">
        <h1>Task Board</h1>
        <p>Next.js client sharing types and validation with the NestJS API.</p>
      </header>
      <Board />
    </main>
  );
}
