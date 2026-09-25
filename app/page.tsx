import Game from "@/components/Game";
import OrientationLock from "@/components/OrientationLock";

export default function Home() {
  return (
    <OrientationLock>
      <Game />
    </OrientationLock>
  );
}
