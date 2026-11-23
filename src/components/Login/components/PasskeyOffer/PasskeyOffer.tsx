"use client";

import { AutomaticCreation } from "./components/AutomaticCreation";
import { OfferChoice } from "./components/OfferChoice";
import { PasskeySaved } from "./components/PasskeySaved";
import { usePasskeyOffer } from "./use-passkey-offer";

export type PasskeyOfferProps = {
  /** The offer is over (passkey created and named, « Plus tard » or « Ne plus me le proposer »): open the module. */
  onDone: () => void;
};

/** MAIR-811, F8 of the Login mockup: propose a passkey after a password sign-in. */
export function PasskeyOffer({ onDone }: PasskeyOfferProps) {
  const offer = usePasskeyOffer(onDone);

  if (offer.stage === "automatic") return <AutomaticCreation />;

  if (offer.stage === "saved") {
    return (
      <PasskeySaved
        provider={offer.provider}
        name={offer.name}
        onNameChange={offer.setName}
        nameError={offer.nameError}
        alert={offer.alert}
        onDismissAlert={offer.dismissAlert}
        isSaving={offer.isSaving}
        onSubmit={offer.onSave}
      />
    );
  }

  return (
    <OfferChoice
      alert={offer.alert}
      onDismissAlert={offer.dismissAlert}
      isCreating={offer.isCreating}
      onCreate={offer.onCreate}
      onLater={offer.onLater}
      onNeverOnThisDevice={offer.onNeverOnThisDevice}
    />
  );
}
