 "use client";

import dynamic from "next/dynamic";

const HomeRoutePage = dynamic(
  () => import("../features/auth").then((mod) => mod.HomeRoutePage),
  {
    ssr: false,
  },
);

export default function Home() {
  return <HomeRoutePage />;
}
