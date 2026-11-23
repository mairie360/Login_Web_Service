"use client";

import { Body, Button, DescriptionList, ErrorAlert, PageTitle, WarningAlert, describeUserAgent, formatDateTime } from "@mairie360/lib-components/primitives";
import { maskIpAddress, type SecurityAlert } from "./security-alert";

export type UnusualActivityProps = {
  alert: SecurityAlert;
  /** E-mail typed at the sign-in, prefilled on the forgotten-password page. */
  email: string;
  isContinuing: boolean;
  /** « J’ai compris » / « C’était moi »: the alert is marked read, then the sign-in goes on. */
  onContinue: () => void;
  /** « Ce n’était pas moi »: the forgotten-password page, with the e-mail prefilled. */
  onNotMe: () => void;
};

function deviceOf(deviceInfo: string | null): string {
  if (!deviceInfo) return "Appareil inconnu";
  const { browser, os } = describeUserAgent(deviceInfo);
  return `${browser} sur ${os}`;
}

/** F9 of the Login mockup, « Activité inhabituelle sur votre compte » (MAIR-773). */
export function UnusualActivity({ alert, isContinuing, onContinue, onNotMe }: UnusualActivityProps) {
  const certain = alert.level === "certain";
  return (
    <div className="flex w-full flex-col items-stretch gap-5">
      <PageTitle>Activité inhabituelle sur votre compte</PageTitle>
      {certain ? (
        <ErrorAlert title="Quelqu’un a essayé d’utiliser votre session depuis un autre appareil." className="w-full" />
      ) : (
        <WarningAlert title="Votre session a été utilisée depuis une autre connexion, peut-être vous après un changement de réseau." className="w-full" />
      )}
      <Body>Par précaution, cette session a été fermée.</Body>
      <DescriptionList
        items={[
          { label: "Date", value: formatDateTime(alert.createdAt) ?? "Inconnue" },
          { label: "Appareil", value: deviceOf(alert.deviceInfo) },
          { label: "Adresse IP", value: maskIpAddress(alert.ipAddress) },
        ]}
      />
      <div className="flex flex-col gap-3">
        <Button fullWidth variant="outline" tone="danger" label="Ce n’était pas moi : changer mon mot de passe" onClick={onNotMe} disabled={isContinuing} />
        <Button fullWidth label={certain ? "J’ai compris, continuer" : "C’était moi, continuer"} loading={isContinuing} onClick={onContinue} />
      </div>
    </div>
  );
}
