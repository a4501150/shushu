import { Wizard } from "@/components/wizard";
import { Masthead } from "@/components/masthead";

export default function Home() {
  return (
    <main className="page">
      <Masthead />
      <Wizard />
    </main>
  );
}
