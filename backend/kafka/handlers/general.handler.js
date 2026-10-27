// kafka/handlers/general.handler.js
// Fallback for event types with no dedicated handler: warn instead of
// throwing so unknown/future events don't pile up in the DLQ.
export const generalHandler = async (payload, event) => {
  console.warn(`[kafka:handler:general] No handler for event type "${event?.type}". Payload:`, payload);
};

export default generalHandler;
