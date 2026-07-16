import Login from "../components/Login";

export default function Home() {
  return <Login redirectUrl={process.env.PROJECT_FRONT_URL} />;
}
