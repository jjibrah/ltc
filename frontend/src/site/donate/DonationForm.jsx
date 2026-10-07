/**
 * Compatibility entry point for older imports.
 *
 * The active donation experience is DonateModal, which uses Stripe-hosted
 * Checkout. This component deliberately contains no PaymentElement,
 * client-secret handling, or browser-side payment confirmation.
 */
export default function DonationForm() {
  const openDonationModal = () => window.dispatchEvent(new Event('ltc:open-donation'));

  return (
    <div className="donation-form-handoff">
      <p>Donation payments are completed securely through Stripe Checkout.</p>
      <button type="button" className="btn btn-primary" onClick={openDonationModal}>
        Continue to donation form
      </button>
    </div>
  );
}
