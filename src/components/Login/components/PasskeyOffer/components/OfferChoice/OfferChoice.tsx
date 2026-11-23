"use client";

import { Body, Button, CreatePasskeyButton, ErrorAlert, Help, Icon, PageTitle, passkeyIcon } from "@mairie360/lib-components/primitives";
import { Settings, Shield } from "lucide-react";

export type OfferChoiceProps = {
  alert: { title: string; description?: string } | null;
  onDismissAlert: () => void;
  isCreating: boolean;
  onCreate: () => void;
  onLater: () => void;
  onNeverOnThisDevice: () => void;
};

const BENEFITS = [
  { icon: passkeyIcon, text: "Enregistrée dans votre gestionnaire de mots de passe (Google, iCloud, Bitwarden…) et disponible sur vos autres appareils." },
  { icon: Shield, text: "Inutilisable sur un faux site qui imiterait Mairie 360." },
  { icon: Settings, text: "Vous pourrez la supprimer à tout moment dans Paramètres." },
];

/** F8 of the Login mockup, « Connectez-vous plus vite avec une passkey » (screen 35 of the simulation). */
export function OfferChoice({ alert, onDismissAlert, isCreating, onCreate, onLater, onNeverOnThisDevice }: OfferChoiceProps) {
  return (
    <div className="flex w-full flex-col items-stretch gap-5">
      <PageTitle>Connectez-vous plus vite avec une passkey</PageTitle>
      <Body>La prochaine fois, plus besoin de mot de passe ni de code : votre empreinte, votre visage ou le code de votre appareil suffiront.</Body>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {BENEFITS.map(({ icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <Icon icon={icon} size="s" className="mt-0.5 shrink-0 text-[var(--mairie-accent)]" />
            <Help className="m-0">{text}</Help>
          </li>
        ))}
      </ul>
      {alert && <ErrorAlert title={alert.title} description={alert.description} onDismiss={onDismissAlert} className="w-full" />}
      <div className="flex flex-col gap-3">
        <CreatePasskeyButton fullWidth loading={isCreating} onClick={onCreate} />
        <Button fullWidth variant="outline" tone="secondary" label="Plus tard" onClick={onLater} disabled={isCreating} />
      </div>
      <Button variant="link" label="Ne plus me le proposer sur cet appareil" onClick={onNeverOnThisDevice} disabled={isCreating} className="self-start" />
    </div>
  );
}
