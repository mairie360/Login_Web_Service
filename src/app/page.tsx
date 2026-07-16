export const dynamic = 'force-dynamic';

import Login from "../components/Login";

const DEFAULT_PROJECT_FRONT_URL = "http://localhost:5001/";

export default function Home() {
  return (
    <Login
      redirectUrl={process.env.PROJECT_FRONT_URL || DEFAULT_PROJECT_FRONT_URL}
    />
  );
}
