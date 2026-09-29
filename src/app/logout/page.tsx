import Logout from "../../components/Logout";
import LoginShell from "../../components/LoginShell";
import { loginShellHrefs } from "../../lib/login-shell-hrefs";

export default function LogoutPage() {
  return <LoginShell hrefs={loginShellHrefs()}><Logout /></LoginShell>;
}
