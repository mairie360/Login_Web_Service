import { Button } from "@mairie360/lib-components/primitives";

export const loginSubmitLabel = (loading: boolean, passwordChange: boolean) =>
  loading
    ? passwordChange ? "Modification…" : "Connexion…"
    : passwordChange ? "Modifier le mot de passe" : "Se connecter";

/** Full-width main action of the card; the lib loading state disables it. */
export const LoginSubmit = ({ loading, passwordChange }: { loading: boolean; passwordChange: boolean }) => (
  <div className="w-full">
    <Button fullWidth loading={loading} label={loginSubmitLabel(loading, passwordChange)} type="submit" />
  </div>
);
