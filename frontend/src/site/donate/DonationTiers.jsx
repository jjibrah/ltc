/** Compatibility entry point. The active amount selector lives in DonateModal. */
export default function DonationTiers() {
  const openDonationModal = () => window.dispatchEvent(new Event('ltc:open-donation'));
  return (
    <button type="button" className="btn btn-primary" onClick={openDonationModal}>
      Choose a donation amount
    </button>
  );
}
