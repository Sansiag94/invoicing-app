// Existing code...

// Function to send the invoice
async function sendInvoice() {
  await fetch(`/api/invoices/${invoice.id}/send`);
  setStatus("sent");
  alert("Invoice marked as sent");
}

return (
  <div>
    {/* ... existing markup ... */}

    {/* Button to Send Invoice */}
    <button onClick={sendInvoice}>
      Send Invoice
    </button>

    {/* ... existing markup ... */}
  </div>
);