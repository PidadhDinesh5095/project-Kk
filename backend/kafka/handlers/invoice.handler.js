// kafka/handlers/invoice.handler.js
import pool from '../../db/pool.js';
import { EVENT_TYPES } from '../constants.js';
import { notify, rupees } from '../notify.js';

// Email only (no push / in-app for invoices).
const handleInvoiceGenerate = async ({ userId, orderId }) => {
  const { rows } = await pool.query(
    `SELECT o.quantity, o.total_amount, p.name AS product_name
       FROM orders o JOIN products p ON p.id = o.product_id
      WHERE o.order_id = $1`,
    [orderId]
  );
  const order = rows[0];
  if (!order) return;

  await notify(userId, {
    push: false,
    inapp: false,
    email: {
      from: 'billing@dineshfarms.app',
      subject: `Invoice — ${orderId}`,
      html: `<h3>Invoice for ${orderId}</h3>
             <p>${order.product_name} x ${order.quantity}</p>
             <p>Total: ${rupees(order.total_amount)}</p>`,
    },
  });
};

export const invoiceHandlers = {
  [EVENT_TYPES.INVOICE_GENERATE]: handleInvoiceGenerate,
};

export default invoiceHandlers;
